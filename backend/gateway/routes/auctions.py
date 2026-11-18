from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

try:
    from backend.gateway.grpc_client import grpc_pool
    from backend.gateway.websocket_manager import ws_manager
except ImportError:
    from grpc_client import grpc_pool
    from websocket_manager import ws_manager

router = APIRouter(prefix="/api/auctions", tags=["Auctions"])


class CreateAuctionRequest(BaseModel):
    title: str = Field(..., example="Vintage Rolex Submariner")
    description: str = Field("", example="Rare 1978 original condition luxury watch.")
    category: str = Field("Watches & Luxury", example="Watches & Luxury")
    image_url: Optional[str] = Field(None, example="https://images.unsplash.com/...")
    start_price: float = Field(..., gt=0, example=1500.0)
    duration_seconds: Optional[int] = Field(3600, example=3600)
    start_time: Optional[int] = Field(None, description="Start time unix millis")
    end_time: Optional[int] = Field(None, description="End time unix millis")
    shard_id: Optional[int] = Field(None, description="Optional target shard ID (1 or 2)")


class PlaceBidRequest(BaseModel):
    bidder: str = Field(..., example="alice_collector")
    amount: float = Field(..., gt=0, example=1600.0)


class EndAuctionRequest(BaseModel):
    manager_username: str = Field(..., example="admin_manager")


@router.post("", summary="Create a new auction")
async def create_auction(req: CreateAuctionRequest):
    try:
        auction = grpc_pool.create_auction(
            title=req.title,
            description=req.description,
            category=req.category,
            start_price=req.start_price,
            duration_seconds=req.duration_seconds or 3600,
            target_shard=req.shard_id,
            image_url=req.image_url,
            start_time=req.start_time,
            end_time=req.end_time
        )
        if not auction or not auction.get("id"):
            raise HTTPException(status_code=500, detail="Failed to create auction.")
        
        await ws_manager.broadcast_to_auction(
            auction["id"],
            {"type": "AUCTION_CREATED", "auction": auction}
        )
        return auction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", summary="List all auctions across shards")
async def list_auctions(
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, ENDED"),
    limit: int = Query(50, ge=1, le=200)
):
    try:
        auctions = grpc_pool.list_all_auctions(status=status, limit=limit)
        return {"total": len(auctions), "auctions": auctions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/special/most-bidded", summary="Get the active auction that currently has the most bids")
async def get_most_bidded():
    auction = grpc_pool.get_most_bidded_auction()
    if not auction:
        return {"found": False, "message": "No active auctions found."}
    return {"found": True, "auction": auction}


@router.get("/{auction_id}", summary="Get auction details by ID")
async def get_auction(auction_id: str):
    auction = grpc_pool.get_auction(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.post("/{auction_id}/bid", summary="Place a bid on an auction via gRPC")
async def place_bid(auction_id: str, req: PlaceBidRequest):
    try:
        from backend.gateway.routes.auth import get_db
    except ImportError:
        from routes.auth import get_db
    db = get_db()
    user = db["users"].find_one({"username": req.bidder.lower().strip()})
    if not user:
        raise HTTPException(status_code=404, detail="Bidder account not found.")

    # 1. Enforce that Managers cannot place bids
    if user.get("role") == "MANAGER":
        raise HTTPException(status_code=403, detail="Managers are not allowed to place bids on auctions.")

    # 2. Enforce Account Approval Status
    if user.get("status") == "PENDING_APPROVAL":
        raise HTTPException(status_code=403, detail="Your account is pending Platform Manager approval. Bidding is restricted until approved.")
    if user.get("status") == "DECLINED":
        raise HTTPException(status_code=403, detail="Your account registration was declined. You cannot place bids.")

    # 3. Enforce Wallet Balance Requirement
    current_balance = float(user.get("balance", 0.0))
    if current_balance < req.amount:
        deficit = req.amount - current_balance
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance! Your available balance is {current_balance:,.0f} Units, but this bid requires {req.amount:,.0f} Units (short by {deficit:,.0f} Units). (1 Unit = 10 USD and 1 Unit = 45000 MMK). Please contact Manager Support to top up."
        )

    res = grpc_pool.place_bid(auction_id=auction_id, bidder=req.bidder, amount=req.amount)
    
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Bid failed"))

    # Track activity
    db["users"].update_one({"_id": user["_id"]}, {"$inc": {"total_bids_placed": 1}})

    await ws_manager.broadcast_to_auction(
        auction_id,
        {
            "type": "NEW_BID",
            "auction_id": auction_id,
            "bidder": req.bidder,
            "amount": req.amount,
            "timestamp": res.get("timestamp"),
            "current_price": res.get("current_price"),
            "updated_auction": res.get("updated_auction")
        }
    )

    return res


@router.get("/{auction_id}/bids", summary="List recent bids for an auction")
async def list_bids(auction_id: str, limit: int = Query(50, ge=1, le=100)):
    bids = grpc_pool.list_bids(auction_id=auction_id, limit=limit)
    return {"auction_id": auction_id, "total": len(bids), "bids": bids}


@router.post("/{auction_id}/end", summary="Manager ends an auction immediately (Hammer Down)")
async def end_auction_by_manager(auction_id: str, req: EndAuctionRequest):
    try:
        from backend.gateway.routes.auth import get_db
    except ImportError:
        from routes.auth import get_db
    db = get_db()
    manager = db["users"].find_one({"username": req.manager_username.lower().strip()})
    if not manager or manager.get("role") != "MANAGER":
        raise HTTPException(
            status_code=403, 
            detail="Unauthorized: Only users with the MANAGER role can conclude or end auctions."
        )

    res = grpc_pool.end_auction(auction_id=auction_id, manager_username=req.manager_username)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Failed to end auction."))

    ended_auction = res.get("auction", {})

    # Broadcast to auction room
    await ws_manager.broadcast_to_auction(
        auction_id,
        {
            "type": "AUCTION_ENDED",
            "auction_id": auction_id,
            "updated_auction": ended_auction,
            "winner": ended_auction.get("highest_bidder", ""),
            "final_price": ended_auction.get("current_price", 0.0),
            "concluded_by": req.manager_username
        }
    )

    # Broadcast to live listing feed
    await ws_manager.broadcast_live(
        {
            "type": "AUCTION_UPDATED",
            "auction_id": auction_id,
            "updated_auction": ended_auction
        }
    )

    return res

