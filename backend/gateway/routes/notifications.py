import os
import time
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pymongo import MongoClient

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

_mongo_client: Optional[MongoClient] = None

def get_db():
    global _mongo_client
    if _mongo_client is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _mongo_client = MongoClient(mongo_uri)
    return _mongo_client["auction_db"]

@router.get("", summary="Get notifications strictly for current account/role")
async def get_notifications(
    username: Optional[str] = Query(None),
    role: Optional[str] = Query("CUSTOMER")
):
    try:
        db = get_db()
        user_role = (role or "CUSTOMER").upper().strip()
        current_username = (username or "").lower().strip()
        
        notifications_map = {}
        now = int(time.time() * 1000)
        day_ms = 86400 * 1000
        hour_ms = 3600 * 1000

        if user_role == "MANAGER":
            # 1. Fetch persistent manager notifications (Account Requests, Wins, Milestones)
            stored_docs = list(db["notifications"].find({"recipientRole": "MANAGER"}).sort("timestamp", -1))
            for doc in stored_docs:
                doc["_id"] = str(doc["_id"])
                nid = doc.get("id") or str(doc["_id"])
                notifications_map[nid] = doc

            # 2. Dynamic generation for Manager for ended auctions with winners
            ended_auctions = list(db["auctions"].find({"status": "ENDED"}).sort("end_time", -1))
            for idx, a in enumerate(ended_auctions):
                if a.get("highest_bidder"):
                    aid = str(a.get("_id", a.get("id", idx)))
                    nid = f"mgr_win_{aid}"
                    if nid not in notifications_map:
                        price = float(a.get("current_price", 0))
                        notifications_map[nid] = {
                            "id": nid,
                            "type": "AUCTION_WON",
                            "recipientRole": "MANAGER",
                            "title": "Auction Concluded & Won",
                            "message": f"@{a.get('highest_bidder')} won '{a.get('title')}' with a final winning bid of {price:,.0f} Units (≈ ${price * 10:,.0f} USD).",
                            "details": {
                                "auction_id": aid,
                                "auction_title": a.get("title"),
                                "winner": a.get("highest_bidder"),
                                "amount": price,
                                "total_bids": a.get("total_bids", 0)
                            },
                            "timestamp": a.get("end_time", now - (idx + 1) * day_ms),
                            "read": idx > 2
                        }

        else:
            # CUSTOMER: Strictly return notifications belonging to this specific user account
            if not current_username:
                # Guests without an account have no personal notifications
                return {"total": 0, "notifications": []}

            # 1. Fetch persistent notifications strictly addressed to this username
            stored_docs = list(db["notifications"].find({"recipientUsername": current_username}).sort("timestamp", -1))
            for doc in stored_docs:
                doc["_id"] = str(doc["_id"])
                nid = doc.get("id") or str(doc["_id"])
                notifications_map[nid] = doc

            # 2. Personal Auction Wins for this specific customer
            user_wins = list(db["auctions"].find({
                "status": "ENDED",
                "highest_bidder": current_username
            }))
            for idx, a in enumerate(user_wins):
                aid = str(a.get("_id", a.get("id", idx)))
                nid = f"cust_win_{current_username}_{aid}"
                if nid not in notifications_map:
                    price = float(a.get("current_price", 0))
                    notifications_map[nid] = {
                        "id": nid,
                        "type": "AUCTION_WON",
                        "recipientRole": "CUSTOMER",
                        "recipientUsername": current_username,
                        "title": "🎉 Winning Bid Victory!",
                        "message": f"Congratulations! You won '{a.get('title')}' with your highest bid of {price:,.0f} Units (≈ ${price * 10:,.0f} USD).",
                        "details": {
                            "auction_id": aid,
                            "auction_title": a.get("title"),
                            "winner": current_username,
                            "amount": price
                        },
                        "timestamp": a.get("end_time", now - (idx + 1) * day_ms),
                        "read": False
                    }

            # 3. Collector Level for this specific user if they have stats
            user_doc = db["users"].find_one({"username": current_username})
            if user_doc:
                tier = user_doc.get("collector_tier", "ACTIVE")
                win_rate = user_doc.get("win_rate", 0)
                won_cnt = user_doc.get("auctions_won", 0)
                tier_titles = {
                    "LEGEND": "Diamond VIP Legend",
                    "MASTER": "Platinum Master Collector",
                    "ELITE": "Gold Elite Bidder",
                    "ACTIVE": "Silver Active Bidder"
                }
                tier_name = tier_titles.get(tier, "Silver Active Bidder")
                
                # If they achieved a tier or won auctions, add tier badge notification
                if won_cnt > 0 or win_rate > 0 or tier in ["LEGEND", "MASTER", "ELITE"]:
                    nid = f"cust_tier_{current_username}"
                    if nid not in notifications_map:
                        notifications_map[nid] = {
                            "id": nid,
                            "type": "LEVEL_ACHIEVED",
                            "recipientRole": "CUSTOMER",
                            "recipientUsername": current_username,
                            "title": f"👑 Collector Tier: {tier_name}",
                            "message": f"You have attained {tier_name} status with a verified {win_rate:.1f}% auction win rate ({won_cnt} victories).",
                            "details": {
                                "winner": current_username,
                                "tier": tier_name,
                                "win_rate": win_rate,
                                "auctions_won": won_cnt
                            },
                            "timestamp": user_doc.get("created_at", now - 2 * day_ms),
                            "read": False
                        }

            # 4. Live Bidding alerts on active items for this customer
            active_bidded = list(db["bids"].find({"bidder": current_username}).sort("timestamp", -1).limit(3))
            for b in active_bidded:
                b_aid = str(b.get("auction_id", ""))
                auc = db["auctions"].find_one({"_id": ObjectId(b_aid)}) if ObjectId.is_valid(b_aid) else db["auctions"].find_one({"_id": b_aid})
                if auc and auc.get("status") == "ACTIVE" and auc.get("highest_bidder") != current_username:
                    aid = str(auc.get("_id", b_aid))
                    nid = f"outbid_{current_username}_{aid}"
                    if nid not in notifications_map:
                        price = float(auc.get("current_price", 0))
                        notifications_map[nid] = {
                            "id": nid,
                            "type": "BID_OUTBID",
                            "recipientRole": "CUSTOMER",
                            "recipientUsername": current_username,
                            "title": "⚡ Outbid Alert",
                            "message": f"A competing collector placed a higher bid on '{auc.get('title')}'. Current leading bid is {price:,.0f} Units (≈ ${price * 10:,.0f} USD).",
                            "details": {
                                "auction_id": aid,
                                "auction_title": auc.get("title"),
                                "amount": price
                            },
                            "timestamp": b.get("timestamp", now - 1800000),
                            "read": False
                        }

        # Final list sorted newest first
        all_notifications = list(notifications_map.values())
        all_notifications.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        return {"total": len(all_notifications), "notifications": all_notifications}

    except Exception as e:
        return {"total": 0, "notifications": [], "error": str(e)}

@router.post("/{notification_id}/read", summary="Mark notification as read")
async def mark_notification_read(notification_id: str):
    db = get_db()
    db["notifications"].update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"success": True, "id": notification_id}

@router.post("/mark-all-read", summary="Mark all notifications as read for user or manager")
async def mark_all_notifications_read(
    username: Optional[str] = Query(None),
    role: Optional[str] = Query("CUSTOMER")
):
    db = get_db()
    user_role = (role or "CUSTOMER").upper().strip()
    current_username = (username or "").lower().strip()
    
    if user_role == "MANAGER":
        db["notifications"].update_many({"recipientRole": "MANAGER"}, {"$set": {"read": True}})
    else:
        if current_username:
            db["notifications"].update_many({"recipientUsername": current_username}, {"$set": {"read": True}})
        else:
            db["notifications"].update_many({}, {"$set": {"read": True}})
            
    return {"success": True, "message": "Notifications marked as read."}

@router.post("/account-request/{req_id}/approve", summary="Manager approves account registration request")
async def approve_account_request(req_id: str):
    db = get_db()
    req = db["notifications"].find_one({"id": req_id})
    if not req:
        req = db["notifications"].find_one({"details.requester_username": req_id})
    
    if not req:
        raise HTTPException(status_code=404, detail="Account request not found.")

    details = req.get("details", {})
    username = details.get("requester_username", "").lower().strip()

    now = int(time.time() * 1000)

    # Create or activate user account in DB
    existing_user = db["users"].find_one({"username": username})
    if not existing_user:
        import hashlib
        db["users"].insert_one({
            "username": username,
            "full_name": details.get("requester_name", username),
            "email": details.get("requester_email", f"{username}@gmail.com"),
            "password_hash": hashlib.sha256("password123".encode("utf-8")).hexdigest(),
            "role": details.get("requester_role", "CUSTOMER"),
            "balance": 0.0,
            "created_at": now,
            "status": "ACTIVE",
            "approved": True,
            "auctions_won": 0,
            "auctions_participated": 0,
            "win_rate": 0.0,
            "total_bids_placed": 0,
            "collector_tier": "ACTIVE"
        })
    else:
        db["users"].update_one(
            {"username": username},
            {"$set": {"status": "ACTIVE", "approved": True}}
        )

    # Update notification status on manager request
    db["notifications"].update_one(
        {"id": req.get("id")},
        {"$set": {"actionStatus": "APPROVED", "read": True}}
    )

    # Insert a personal welcome notification strictly for this approved customer
    welcome_notif_id = f"cust_welcome_{username}_{now}"
    existing_welcome = db["notifications"].find_one({"id": welcome_notif_id})
    if not existing_welcome:
        db["notifications"].insert_one({
            "id": welcome_notif_id,
            "type": "LEVEL_ACHIEVED",
            "recipientRole": "CUSTOMER",
            "recipientUsername": username,
            "title": "🎉 Account Approved!",
            "message": f"Welcome to NovaAuction @{username}! Your account has been reviewed and approved by the Platform Manager. You can now explore live auctions and place bids.",
            "details": {
                "winner": username,
                "tier": "Silver Active Bidder",
                "win_rate": 0.0
            },
            "timestamp": now,
            "read": False
        })

    return {
        "success": True,
        "message": f"Account @{username} approved and activated successfully.",
        "username": username
    }

@router.post("/account-request/{req_id}/decline", summary="Manager declines account registration request")
async def decline_account_request(req_id: str):
    db = get_db()
    req = db["notifications"].find_one({"id": req_id})
    if not req:
        req = db["notifications"].find_one({"details.requester_username": req_id})

    if not req:
        raise HTTPException(status_code=404, detail="Account request not found.")

    username = req.get("details", {}).get("requester_username", "").lower().strip()
    
    if username:
        db["users"].update_one(
            {"username": username},
            {"$set": {"status": "DECLINED", "approved": False}}
        )

    db["notifications"].update_one(
        {"id": req.get("id")},
        {"$set": {"actionStatus": "DECLINED", "read": True}}
    )

    return {
        "success": True,
        "message": f"Account request for @{username} declined.",
        "username": username
    }
