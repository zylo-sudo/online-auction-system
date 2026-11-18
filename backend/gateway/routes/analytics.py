import os
import sys
import subprocess
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pymongo import MongoClient

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

_mongo_client: Optional[MongoClient] = None

def get_db():
    global _mongo_client
    if _mongo_client is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _mongo_client = MongoClient(mongo_uri)
    return _mongo_client["auction_db"]


@router.get("/trending", summary="Get top trending auctions computed by PySpark")
async def get_trending(limit: int = Query(10, ge=1, le=50)):
    try:
        db = get_db()
        trending_col = db["analytics_trending"]
        cursor = trending_col.find().sort("trending_score", -1).limit(limit)
        results = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)
        return {"total": len(results), "trending_auctions": results}
    except Exception as e:
        return {"total": 0, "trending_auctions": [], "error": str(e)}


@router.get("/recommendations/{bidder}", summary="Get personalized item recommendations for a user")
async def get_recommendations(bidder: str, limit: int = Query(5, ge=1, le=20)):
    try:
        db = get_db()
        reco_col = db["analytics_recommendations"]
        doc = reco_col.find_one({"bidder": bidder})
        if not doc:
            return {"bidder": bidder, "preferred_categories": ["Electronics", "Watches & Luxury", "Gaming & Tech"], "recommendations": []}
        
        doc["_id"] = str(doc["_id"])
        return doc
    except Exception as e:
        return {"bidder": bidder, "recommendations": [], "error": str(e)}


@router.get("/fraud-alerts", summary="Get shill bidding & anomaly alerts computed by PySpark")
async def get_fraud_alerts(limit: int = Query(20, ge=1, le=100)):
    try:
        db = get_db()
        fraud_col = db["analytics_fraud"]
        cursor = fraud_col.find().sort("timestamp", -1).limit(limit)
        results = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            results.append(doc)
        return {"total": len(results), "alerts": results}
    except Exception as e:
        return {"total": 0, "alerts": [], "error": str(e)}


@router.post("/trigger", summary="Trigger PySpark analytics batch job")
async def trigger_analytics_job():
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        script_path = os.path.join(root_dir, "analytics", "run_all.py")
        
        if os.path.exists(script_path):
            proc = subprocess.Popen([sys.executable, script_path, "--once"], cwd=os.path.dirname(script_path))
            return {"status": "success", "message": "PySpark analytics pipeline triggered in background."}
        else:
            return {"status": "warning", "message": "Analytics runner script not found at path."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
