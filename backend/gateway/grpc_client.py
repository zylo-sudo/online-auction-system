import os
import sys
import time
import hashlib
from typing import Dict, List, Optional, Any
import grpc
from bson import ObjectId
from pymongo import MongoClient, ReturnDocument

# Add local path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generated import auction_pb2, auction_pb2_grpc


class GrpcShardClientPool:
    def __init__(self):
        shard_hosts_str = os.getenv("SHARD_HOSTS", "localhost:50051,localhost:50052")
        self.shard_hosts = [h.strip() for h in shard_hosts_str.split(",") if h.strip()]
        if not self.shard_hosts:
            self.shard_hosts = ["localhost:50051", "localhost:50052"]

        self.num_shards = len(self.shard_hosts)
        self.channels: Dict[int, grpc.Channel] = {}
        self.stubs: Dict[int, auction_pb2_grpc.AuctionShardServiceStub] = {}
        self.mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        self._mongo_client: Optional[MongoClient] = None
        self._init_channels()

    def _get_db(self):
        if self._mongo_client is None:
            self._mongo_client = MongoClient(self.mongo_uri)
        return self._mongo_client["auction_db"]

    def _init_channels(self):
        for idx, host in enumerate(self.shard_hosts, start=1):
            try:
                channel = grpc.insecure_channel(host)
                self.channels[idx] = channel
                self.stubs[idx] = auction_pb2_grpc.AuctionShardServiceStub(channel)
                print(f"[Gateway] Initialized gRPC channel for Shard {idx} -> {host}")
            except Exception as e:
                print(f"[Gateway] Error connecting to Shard {idx}: {e}")

    def get_shard_id_for_auction(self, auction_id: str) -> int:
        if not auction_id:
            return 1
        hash_val = int(hashlib.md5(auction_id.encode("utf-8")).hexdigest(), 16)
        return (hash_val % self.num_shards) + 1

    def get_stub(self, shard_id: int) -> Optional[auction_pb2_grpc.AuctionShardServiceStub]:
        if shard_id not in self.stubs:
            shard_id = 1
        return self.stubs.get(shard_id)

    def create_auction(
        self,
        title: str,
        description: str,
        category: str,
        start_price: float,
        duration_seconds: int = 3600,
        target_shard: Optional[int] = None,
        image_url: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> Dict[str, Any]:
        if not target_shard or target_shard < 1 or target_shard > self.num_shards:
            hash_val = int(hashlib.md5(title.encode("utf-8")).hexdigest(), 16)
            target_shard = (hash_val % self.num_shards) + 1

        db = self._get_db()
        now = int(time.time() * 1000)
        
        final_start_time = int(start_time) if start_time else now
        final_end_time = int(end_time) if end_time else (final_start_time + (duration_seconds * 1000))
        
        # Determine status: if starting in future, mark UPCOMING
        status = "UPCOMING" if final_start_time > now + 60000 else "ACTIVE"

        doc = {
            "title": title,
            "description": description,
            "category": category or "General",
            "image_url": image_url or "",
            "start_price": float(start_price),
            "current_price": float(start_price),
            "highest_bidder": "",
            "start_time": final_start_time,
            "end_time": final_end_time,
            "status": status,
            "shard_id": target_shard,
            "total_bids": 0,
            "created_at": now
        }
        res = db["auctions"].insert_one(doc)
        doc["id"] = str(res.inserted_id)
        if "_id" in doc:
            del doc["_id"]

        # Also log event for PySpark
        try:
            db["events"].insert_one({
                "event_type": "AUCTION_CREATED",
                "auction_id": doc["id"],
                "category": doc["category"],
                "start_price": doc["start_price"],
                "shard_id": doc["shard_id"],
                "timestamp": now
            })
        except Exception:
            pass

        return doc

    def get_auction(self, auction_id: str, shard_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        shards_to_try = []
        if shard_id and shard_id in self.stubs:
            shards_to_try.append(shard_id)
        else:
            primary = self.get_shard_id_for_auction(auction_id)
            shards_to_try.append(primary)
            for s in self.stubs.keys():
                if s not in shards_to_try:
                    shards_to_try.append(s)

        for sid in shards_to_try:
            try:
                stub = self.get_stub(sid)
                if stub:
                    req = auction_pb2.GetAuctionRequest(auction_id=auction_id, shard_id=sid)
                    res = stub.GetAuction(req)
                    if res and res.id:
                        return self._proto_auction_to_dict(res)
            except Exception:
                pass

        # Fallback: direct MongoDB read
        try:
            db = self._get_db()
            oid = ObjectId(auction_id) if ObjectId.is_valid(auction_id) else auction_id
            doc = db["auctions"].find_one({"_id": oid})
            if doc:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                return doc
        except Exception:
            pass

        return None

    def place_bid(self, auction_id: str, bidder: str, amount: float, shard_id: Optional[int] = None) -> Dict[str, Any]:
        auction = self.get_auction(auction_id, shard_id)
        if not auction:
            return {"success": False, "message": "Auction not found."}

        actual_shard = auction.get("shard_id", self.get_shard_id_for_auction(auction_id))
        stub = self.get_stub(actual_shard)

        if stub:
            try:
                req = auction_pb2.PlaceBidRequest(
                    auction_id=auction_id,
                    bidder=bidder,
                    amount=float(amount),
                    shard_id=actual_shard
                )
                res = stub.PlaceBid(req)
                updated_auction_dict = None
                if res.updated_auction and res.updated_auction.id:
                    updated_auction_dict = self._proto_auction_to_dict(res.updated_auction)

                return {
                    "success": res.success,
                    "message": res.message,
                    "current_price": res.current_price,
                    "highest_bidder": res.highest_bidder,
                    "timestamp": res.timestamp,
                    "updated_auction": updated_auction_dict
                }
            except Exception as e:
                print(f"[Gateway] gRPC placeBid failed: {e}")

        # Fallback to direct DB atomic logic if shard gRPC is unreachable
        try:
            from shard.db import Database
            db_handler = Database(mongo_uri=self.mongo_uri)
            return db_handler.place_bid(auction_id, bidder, amount, actual_shard)
        except ImportError:
            db = self._get_db()
            now = int(time.time() * 1000)
            oid = ObjectId(auction_id) if ObjectId.is_valid(auction_id) else auction_id
            updated_doc = db["auctions"].find_one_and_update(
                {"_id": oid, "status": "ACTIVE", "end_time": {"$gt": now}, "current_price": {"$lt": float(amount)}},
                {"$set": {"current_price": float(amount), "highest_bidder": bidder}, "$inc": {"total_bids": 1}},
                return_document=ReturnDocument.AFTER
            )
            if not updated_doc:
                fresh = db["auctions"].find_one({"_id": oid})
                curr_p = fresh.get("current_price", 0.0) if fresh else amount
                return {"success": False, "message": f"Bid rejected. Current price is {curr_p:,.2f} Units."}
            updated_doc["id"] = str(updated_doc["_id"])
            del updated_doc["_id"]
            db["bids"].insert_one({
                "auction_id": str(oid), "bidder": bidder, "amount": float(amount),
                "timestamp": now, "shard_id": actual_shard
            })
            db["events"].insert_one({
                "event_type": "BID_PLACED", "auction_id": str(oid), "bidder": bidder,
                "amount": float(amount), "category": updated_doc.get("category", "General"),
                "shard_id": actual_shard, "timestamp": now
            })
            return {
                "success": True, "message": "Bid accepted successfully!",
                "current_price": float(amount), "highest_bidder": bidder,
                "timestamp": now, "updated_auction": updated_doc
            }

    def list_bids(self, auction_id: str, limit: int = 50, shard_id: Optional[int] = None) -> List[Dict[str, Any]]:
        auction = self.get_auction(auction_id, shard_id)
        actual_shard = auction.get("shard_id", self.get_shard_id_for_auction(auction_id)) if auction else 1

        stub = self.get_stub(actual_shard)
        if stub:
            try:
                req = auction_pb2.ListBidsRequest(auction_id=auction_id, limit=limit, shard_id=actual_shard)
                res = stub.ListBids(req)
                if res and res.bids:
                    return [
                        {
                            "id": b.id,
                            "auction_id": b.auction_id,
                            "bidder": b.bidder,
                            "amount": b.amount,
                            "timestamp": b.timestamp,
                            "shard_id": b.shard_id
                        }
                        for b in res.bids
                    ]
            except Exception:
                pass

        # Fallback
        try:
            db = self._get_db()
            cursor = db["bids"].find({"auction_id": str(auction_id)}).sort("timestamp", -1).limit(limit)
            results = []
            for b in cursor:
                b["id"] = str(b["_id"])
                del b["_id"]
                results.append(b)
            return results
        except Exception:
            return []

    def list_all_auctions(self, status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        all_auctions = []
        try:
            db = self._get_db()
            query = {}
            if status:
                query["status"] = status
            cursor = db["auctions"].find(query).sort("created_at", -1).limit(limit)
            for doc in cursor:
                doc["id"] = str(doc["_id"])
                del doc["_id"]
                all_auctions.append(doc)
        except Exception as e:
            print(f"[Gateway] DB query error in list_all_auctions: {e}")

        # Fallback to gRPC shards if DB query failed
        if not all_auctions:
            for sid, stub in self.stubs.items():
                try:
                    req = auction_pb2.ListAuctionsRequest(
                        shard_id=sid,
                        status=status or "",
                        limit=limit
                    )
                    res = stub.ListAuctions(req)
                    for a in res.auctions:
                        all_auctions.append(self._proto_auction_to_dict(a))
                except Exception:
                    pass

        all_auctions.sort(key=lambda x: x.get("start_time", 0), reverse=True)
        return all_auctions[:limit]

    def end_auction(self, auction_id: str, manager_username: str = "Manager") -> Dict[str, Any]:
        db = self._get_db()
        oid = ObjectId(auction_id) if ObjectId.is_valid(auction_id) else auction_id
        
        now = int(time.time() * 1000)
        current = db["auctions"].find_one({"_id": oid})
        if not current:
            return {"success": False, "message": "Auction not found."}

        if current.get("status") == "ENDED":
            current["id"] = str(current["_id"])
            del current["_id"]
            return {"success": True, "message": "Auction has already been concluded.", "auction": current}

        # Conclude auction immediately
        updated = db["auctions"].find_one_and_update(
            {"_id": oid},
            {
                "$set": {
                    "status": "ENDED",
                    "end_time": now,
                    "concluded_by": manager_username,
                    "concluded_at": now
                }
            },
            return_document=ReturnDocument.AFTER
        )
        if not updated:
            return {"success": False, "message": "Failed to update auction."}

        updated["id"] = str(updated["_id"])
        if "_id" in updated:
            del updated["_id"]

        highest_bidder = updated.get("highest_bidder")
        winning_price = float(updated.get("current_price", updated.get("start_price", 0.0)))
        title = updated.get("title", "Luxury Item")

        if highest_bidder:
            winner_username = highest_bidder.lower().strip()
            # 1. Update winner's account stats
            db["users"].update_one(
                {"username": winner_username},
                {"$inc": {"auctions_won": 1}}
            )

            # 2. Insert notification for winner (aligned with AppNotification schema)
            winner_noti = {
                "id": f"cust_win_{winner_username}_{updated['id']}",
                "type": "AUCTION_WON",
                "recipientRole": "CUSTOMER",
                "recipientUsername": winner_username,
                "title": "🏆 You Won the Auction!",
                "message": f"Congratulations! The auction for '{title}' was officially concluded by Platform Manager @{manager_username}. You won with the winning bid of {winning_price:,.0f} Units (≈ ${winning_price*10:,.0f} USD • {winning_price*45000:,.0f} MMK)! Private VIP escrow is ready.",
                "details": {
                    "auction_id": updated["id"],
                    "auction_title": title,
                    "winner": winner_username,
                    "amount": winning_price
                },
                "timestamp": now,
                "read": False
            }
            db["notifications"].insert_one(winner_noti)

        # Insert notification for managers (aligned with AppNotification schema)
        manager_noti = {
            "id": f"mgr_win_{updated['id']}",
            "type": "AUCTION_WON",
            "recipientRole": "MANAGER",
            "title": "🔨 Auction Concluded Early",
            "message": f"Auction '{title}' was officially concluded by Manager @{manager_username}. " + 
                       (f"Official Winner: @{highest_bidder} at {winning_price:,.0f} Units." if highest_bidder else "Concluded with no bids placed."),
            "details": {
                "auction_id": updated["id"],
                "auction_title": title,
                "winner": highest_bidder or "",
                "amount": winning_price,
                "total_bids": updated.get("total_bids", 0)
            },
            "timestamp": now,
            "read": False
        }
        db["notifications"].insert_one(manager_noti)

        # Log event for PySpark analytics
        try:
            db["events"].insert_one({
                "event_type": "AUCTION_ENDED",
                "auction_id": updated["id"],
                "highest_bidder": highest_bidder or "",
                "final_price": winning_price,
                "concluded_by": manager_username,
                "timestamp": now
            })
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Auction officially concluded by manager. Winner: @{highest_bidder or 'None'} at {winning_price:,.0f} Units.",
            "auction": updated
        }

    def get_most_bidded_auction(self) -> Optional[Dict[str, Any]]:
        db = self._get_db()
        doc = db["auctions"].find_one(
            {"status": "ACTIVE"},
            sort=[("total_bids", -1), ("current_price", -1)]
        )
        if doc:
            doc["id"] = str(doc["_id"])
            if "_id" in doc:
                del doc["_id"]
            return doc
        return None

    def _proto_auction_to_dict(self, p: auction_pb2.Auction) -> Dict[str, Any]:
        return {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "category": p.category,
            "image_url": p.image_url or "",
            "start_price": p.start_price,
            "current_price": p.current_price,
            "highest_bidder": p.highest_bidder,
            "start_time": p.start_time,
            "end_time": p.end_time,
            "status": p.status,
            "shard_id": p.shard_id,
            "total_bids": p.total_bids
        }


# Global singleton instance
grpc_pool = GrpcShardClientPool()

