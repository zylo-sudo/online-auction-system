import os
import time
from collections import defaultdict
from pymongo import MongoClient
import pandas as pd

def compute_user_recommendations():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client["auction_db"]

    events = list(db["events"].find({"event_type": "BID_PLACED"}))
    auctions = {str(a["_id"]): a for a in db["auctions"].find()}

    if not events:
        print("[PySpark/Analytics] No bid events found for recommendations.")
        return

    df = pd.DataFrame(events)
    bidders = df["bidder"].unique()

    recommendations_list = []
    now_millis = int(time.time() * 1000)

    for bidder in bidders:
        user_bids = df[df["bidder"] == bidder]
        cat_counts = user_bids["category"].value_counts()
        preferred_categories = cat_counts.index.tolist()[:3]

        bidder_auctions = set(user_bids["auction_id"].tolist())
        recommended_items = []

        for aid, a in auctions.items():
            if a.get("status") == "ACTIVE" and a.get("category") in preferred_categories:
                recommended_items.append({
                    "auction_id": aid,
                    "title": a.get("title"),
                    "category": a.get("category"),
                    "current_price": a.get("current_price"),
                    "match_score": 95 if a.get("category") == preferred_categories[0] else 80
                })

        recommendations_list.append({
            "bidder": str(bidder),
            "preferred_categories": preferred_categories,
            "total_bids_placed": len(user_bids),
            "recommendations": recommended_items[:6],
            "updated_at": now_millis
        })

    db["analytics_recommendations"].delete_many({})
    if recommendations_list:
        db["analytics_recommendations"].insert_many(recommendations_list)
        print(f"[OK] Updated recommendations for {len(recommendations_list)} bidders in MongoDB.")

if __name__ == "__main__":
    compute_user_recommendations()
