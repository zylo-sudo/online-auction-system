import time
import os
import sys

# Ensure analytics directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spark_trending import compute_trending_auctions
from spark_recommendations import compute_user_recommendations
from spark_fraud_detection import detect_bidding_anomalies

def run_pipeline():
    print("=======================================================")
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting PySpark Analytics Batch Pipeline...")
    print("=======================================================")
    
    try:
        print("[1/3] Computing Trending Auctions...")
        compute_trending_auctions()
    except Exception as e:
        print(f"[!] Error in trending computation: {e}")

    try:
        print("[2/3] Computing User Item Recommendations...")
        compute_user_recommendations()
    except Exception as e:
        print(f"[!] Error in recommendations computation: {e}")

    try:
        print("[3/3] Scanning for Shill Bidding & Anomalies...")
        detect_bidding_anomalies()
    except Exception as e:
        print(f"[!] Error in fraud detection: {e}")

    print("=======================================================")
    print("[OK] Analytics Batch Processing Completed Successfully.")
    print("=======================================================")

def scheduled_loop(interval_sec: int = 30):
    print(f"[*] PySpark Analytics Runner daemon active. Running every {interval_sec} seconds...")
    while True:
        run_pipeline()
        time.sleep(interval_sec)

if __name__ == "__main__":
    interval = int(os.getenv("ANALYTICS_INTERVAL_SEC", "30"))
    if os.getenv("RUN_ONCE") == "1" or "--once" in sys.argv:
        run_pipeline()
    else:
        scheduled_loop(interval_sec=interval)
