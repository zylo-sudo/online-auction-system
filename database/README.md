# MongoDB Database Documentation

This folder manages the **MongoDB NoSQL document store** for the distributed auction platform.

---

## 📊 Collections Overview

| Collection | Description | Primary Key / Key Indexes |
| :--- | :--- | :--- |
| `auctions` | Stores active, ended, and cancelled auctions | `_id`, `shard_id`, `status`, `category` |
| `bids` | Historical bid logs placed by users | `_id`, `auction_id`, `bidder`, `timestamp` |
| `events` | Real-time event stream consumed by PySpark | `_id`, `event_type`, `auction_id`, `timestamp` |
| `analytics_trending` | Cached trending scores computed by PySpark | `_id`, `trending_score`, `auction_id` |
| `analytics_recommendations` | Tailored recommendations per user | `_id`, `bidder` (unique) |
| `analytics_fraud` | Shill bidding & anomaly flags | `_id`, `alert_type`, `timestamp` |

---

## 🔒 Concurrency & Atomicity Guarantee

In a distributed auction system, multiple bidders may place competing bids simultaneously. To prevent race conditions, the shard service ([`backend/shard/db.py`](file:///c:/School%20Projects/Sem-8/Distributed_Programming/rmi-distributed-auction/backend/shard/db.py)) executes atomic conditional updates:

```python
updated_doc = self.auctions.find_one_and_update(
    {
        "_id": ObjectId(auction_id),
        "status": "ACTIVE",
        "end_time": {"$gt": now},
        "current_price": {"$lt": amount}
    },
    {
        "$set": {"current_price": amount, "highest_bidder": bidder},
        "$inc": {"total_bids": 1}
    },
    return_document=ReturnDocument.AFTER
)
```

---

## 🛠️ Scripts in this directory

1. **`init_mongo.js`**: Automatically run by MongoDB Docker container on startup to initialize collections and compound indexes.
2. **`seed.py`**: Helper script to seed sample luxury auctions and historical bid events.
   ```bash
   python database/seed.py
   ```
