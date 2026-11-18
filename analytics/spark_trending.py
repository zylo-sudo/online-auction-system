import os
import time
from pymongo import MongoClient
import pandas as pd

def compute_trending_auctions():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client["auction_db"]

    events = list(db["events"].find())
    auctions = {str(a["_id"]): a for a in db["auctions"].find()}

    if not events:
        print("[PySpark/Analytics] No events found to calculate trending auctions.")
        return

    df = pd.DataFrame(events)
    bid_events = df[df["event_type"] == "BID_PLACED"]

    if bid_events.empty:
        print("[PySpark/Analytics] No bid events found.")
        return

    now_millis = int(time.time() * 1000)
    one_hour_ago = now_millis - (3600 * 1000)

    trending_results = []

    for auction_id, group in bid_events.groupby("auction_id"):
        auction_info = auctions.get(str(auction_id), {})
        if not auction_info:
            continue

        total_bids = len(group)
        unique_bidders = group["bidder"].nunique()
        recent_bids = len(group[group["timestamp"] >= one_hour_ago])
        
        start_price = float(auction_info.get("start_price", 1.0))
        current_price = float(auction_info.get("current_price", start_price))
        price_growth_pct = ((current_price - start_price) / max(start_price, 1.0)) * 100.0

        trending_score = round(
            (total_bids * 2.0) + (recent_bids * 5.0) + (unique_bidders * 4.0) + (price_growth_pct * 0.5),
            2
        )

        trending_results.append({
            "auction_id": str(auction_id),
            "title": auction_info.get("title", "Unknown Auction"),
            "category": auction_info.get("category", "General"),
            "current_price": current_price,
            "total_bids": total_bids,
            "unique_bidders": unique_bidders,
            "recent_bids_1h": recent_bids,
            "price_growth_pct": round(price_growth_pct, 2),
            "trending_score": trending_score,
            "status": auction_info.get("status", "ACTIVE"),
            "updated_at": now_millis
        })

    trending_results.sort(key=lambda x: x["trending_score"], reverse=True)

    db["analytics_trending"].delete_many({})
    if trending_results:
        db["analytics_trending"].insert_many(trending_results)
        print(f"[OK] Updated {len(trending_results)} trending auctions in MongoDB.")

if __name__ == "__main__":
    compute_trending_auctions()
