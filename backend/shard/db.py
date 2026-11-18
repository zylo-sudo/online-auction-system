import os
import time
from typing import Dict, Any, List, Optional
from bson import ObjectId
from pymongo import MongoClient, ReturnDocument

class Database:
    def __init__(self, mongo_uri: Optional[str] = None, db_name: str = "auction_db"):
        uri = mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017")
        self.client = MongoClient(uri)
        self.db = self.client[db_name]
        self.auctions = self.db["auctions"]
        self.bids = self.db["bids"]
        self.events = self.db["events"]
        self._create_indexes()

    def _create_indexes(self):
        try:
            self.auctions.create_index("shard_id")
            self.auctions.create_index("status")
            self.bids.create_index([("auction_id", 1), ("timestamp", -1)])
            self.events.create_index([("event_type", 1), ("timestamp", -1)])
        except Exception:
            pass

    def _now_millis(self) -> int:
        return int(time.time() * 1000)

    def create_auction(
        self,
        title: str,
        description: str,
        category: str,
        start_price: float,
        duration_seconds: int,
        shard_id: int,
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        now = self._now_millis()
        end_time = now + (duration_seconds * 1000)
        
        doc = {
            "title": title,
            "description": description,
            "category": category or "General",
            "image_url": image_url or "",
            "start_price": float(start_price),
            "current_price": float(start_price),
            "highest_bidder": "",
            "start_time": now,
            "end_time": end_time,
            "status": "ACTIVE",
            "shard_id": shard_id,
            "total_bids": 0,
            "created_at": now
        }
        res = self.auctions.insert_one(doc)
        doc["_id"] = str(res.inserted_id)

        # Log event for PySpark Analytics
        self.events.insert_one({
            "event_type": "AUCTION_CREATED",
            "auction_id": doc["_id"],
            "category": doc["category"],
            "start_price": doc["start_price"],
            "shard_id": shard_id,
            "timestamp": now
        })
        return doc

    def get_auction(self, auction_id: str) -> Optional[Dict[str, Any]]:
        try:
            oid = ObjectId(auction_id) if ObjectId.is_valid(auction_id) else auction_id
        except Exception:
            return None

        doc = self.auctions.find_one({"_id": oid})
        if not doc:
            return None
        
        doc["_id"] = str(doc["_id"])
        now = self._now_millis()
        if doc.get("status") == "ACTIVE" and now >= doc.get("end_time", 0):
            self.auctions.update_one(
                {"_id": oid, "status": "ACTIVE"},
                {"$set": {"status": "ENDED"}}
            )
            doc["status"] = "ENDED"
            
        return doc

    def place_bid(self, auction_id: str, bidder: str, amount: float, shard_id: int) -> Dict[str, Any]:
        now = self._now_millis()
        try:
            oid = ObjectId(auction_id) if ObjectId.is_valid(auction_id) else auction_id
        except Exception:
            return {"success": False, "message": "Invalid auction ID format."}

        current_doc = self.auctions.find_one({"_id": oid})
        if not current_doc:
            return {"success": False, "message": "Auction not found."}

        if current_doc.get("status") != "ACTIVE" or now >= current_doc.get("end_time", 0):
            if current_doc.get("status") == "ACTIVE":
                self.auctions.update_one({"_id": oid}, {"$set": {"status": "ENDED"}})
            return {"success": False, "message": "Auction has already ended."}

        if amount <= current_doc.get("current_price", 0.0):
            return {
                "success": False, 
                "message": f"Bid amount ({amount:,.2f} Units) must be higher than current price ({current_doc.get('current_price', 0.0):,.2f} Units).",
                "current_price": current_doc.get("current_price", 0.0),
                "highest_bidder": current_doc.get("highest_bidder", "")
            }

        # Atomic conditional update
        updated_doc = self.auctions.find_one_and_update(
            {
                "_id": oid,
                "status": "ACTIVE",
                "end_time": {"$gt": now},
                "current_price": {"$lt": amount}
            },
            {
                "$set": {
                    "current_price": amount,
                    "highest_bidder": bidder
                },
                "$inc": {"total_bids": 1}
            },
            return_document=ReturnDocument.AFTER
        )

        if not updated_doc:
            fresh = self.auctions.find_one({"_id": oid})
            curr_p = fresh.get("current_price", 0.0) if fresh else amount
            return {
                "success": False,
                "message": f"Concurrent bid detected. Current price is now {curr_p:,.2f} Units.",
                "current_price": curr_p,
                "highest_bidder": fresh.get("highest_bidder", "") if fresh else ""
            }

        updated_doc["_id"] = str(updated_doc["_id"])

        bid_doc = {
            "auction_id": str(oid),
            "bidder": bidder,
            "amount": amount,
            "timestamp": now,
            "shard_id": shard_id
        }
        res_bid = self.bids.insert_one(bid_doc)
        bid_doc["_id"] = str(res_bid.inserted_id)

        # Log event for PySpark
        self.events.insert_one({
            "event_type": "BID_PLACED",
            "auction_id": str(oid),
            "bidder": bidder,
            "amount": amount,
            "category": updated_doc.get("category", "General"),
            "shard_id": shard_id,
            "timestamp": now
        })

        return {
            "success": True,
            "message": "Bid accepted successfully!",
            "current_price": amount,
            "highest_bidder": bidder,
            "timestamp": now,
            "updated_auction": updated_doc
        }

    def list_bids(self, auction_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.bids.find({"auction_id": str(auction_id)}).sort("timestamp", -1).limit(limit)
        results = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)
        return results

    def list_auctions(self, shard_id: Optional[int] = None, status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        query = {}
        if shard_id and shard_id > 0:
            query["shard_id"] = shard_id
        if status:
            query["status"] = status

        cursor = self.auctions.find(query).sort("created_at", -1).limit(limit)
        results = []
        now = self._now_millis()
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if doc.get("status") == "ACTIVE" and now >= doc.get("end_time", 0):
                doc["status"] = "ENDED"
            results.append(doc)
        return results
