import os
import time
from pymongo import MongoClient
import pandas as pd

def detect_bidding_anomalies():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client["auction_db"]

    events = list(db["events"].find({"event_type": "BID_PLACED"}).sort("timestamp", 1))

    if not events:
        print("[PySpark/Analytics] No events found for anomaly detection.")
        return

    df = pd.DataFrame(events)
    alerts = []
    now_millis = int(time.time() * 1000)

    # 1. Rapid consecutive bids detection (< 2.5 seconds)
    for (auction_id, bidder), group in df.groupby(["auction_id", "bidder"]):
        if len(group) < 3:
            continue
        
        timestamps = group["timestamp"].tolist()
        amounts = group["amount"].tolist()
        
        for i in range(len(timestamps) - 1):
            time_diff_ms = timestamps[i+1] - timestamps[i]
            if time_diff_ms < 2500:
                alerts.append({
                    "alert_type": "HIGH_FREQUENCY_BIDDING",
                    "severity": "MEDIUM",
                    "auction_id": str(auction_id),
                    "bidder": str(bidder),
                    "details": f"Rapid consecutive bids placed ({time_diff_ms}ms apart). Amounts: {amounts[i]:,.0f} Units -> {amounts[i+1]:,.0f} Units",
                    "timestamp": timestamps[i+1]
                })

    # 2. Extreme Price Spike Detection (> 200% jump)
    for auction_id, group in df.groupby("auction_id"):
        sorted_group = group.sort_values("timestamp")
        amounts = sorted_group["amount"].tolist()
        bidders = sorted_group["bidder"].tolist()
        ts = sorted_group["timestamp"].tolist()
        
        for i in range(len(amounts) - 1):
            if amounts[i] > 0 and amounts[i+1] >= (amounts[i] * 3.0):
                alerts.append({
                    "alert_type": "EXTREME_PRICE_SPIKE",
                    "severity": "HIGH",
                    "auction_id": str(auction_id),
                    "bidder": str(bidders[i+1]),
                    "details": f"Abnormal bid jump from {amounts[i]:,.0f} Units to {amounts[i+1]:,.0f} Units (Price surge: {((amounts[i+1]-amounts[i])/amounts[i])*100:.0f}%)",
                    "timestamp": ts[i+1]
                })

    db["analytics_fraud"].delete_many({})
    if alerts:
        db["analytics_fraud"].insert_many(alerts)
        print(f"[OK] Flagged {len(alerts)} suspicious bidding anomalies in MongoDB.")
    else:
        print("[OK] Scan complete: No suspicious anomalies flagged.")

if __name__ == "__main__":
    detect_bidding_anomalies()
