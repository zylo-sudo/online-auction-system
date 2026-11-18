import hashlib
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from pymongo import MongoClient
import os

router = APIRouter(prefix="/api/auth", tags=["Authentication & Users"])

_mongo_client: Optional[MongoClient] = None

def get_db():
    global _mongo_client
    if _mongo_client is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _mongo_client = MongoClient(mongo_uri)
    return _mongo_client["auction_db"]

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, example="john_manager")
    full_name: str = Field(..., min_length=2, max_length=60, example="John Manager")
    email: str = Field(..., min_length=5, max_length=100, example="john@auction.com")
    password: str = Field(..., min_length=6, example="password123")
    role: str = Field("CUSTOMER", description="Role: 'CUSTOMER' or 'MANAGER'", example="CUSTOMER")

class LoginRequest(BaseModel):
    username_or_email: str = Field(..., example="alice_collector")
    password: str = Field(..., example="password123")
    role: Optional[str] = Field(None, description="Selected role during login: 'CUSTOMER' or 'MANAGER'")

@router.post("/register", summary="Register a new User (Customer or Manager - Requires Manager Approval)")
async def register(req: RegisterRequest):
    db = get_db()
    users_col = db["users"]

    if users_col.find_one({"username": req.username.lower().strip()}):
        raise HTTPException(status_code=400, detail="Username is already taken.")
    if users_col.find_one({"email": req.email.lower().strip()}):
        raise HTTPException(status_code=400, detail="Email is already registered.")

    role = req.role.upper()
    if role not in ["CUSTOMER", "MANAGER"]:
        role = "CUSTOMER"

    now = int(time.time() * 1000)
    user_doc = {
        "username": req.username.lower().strip(),
        "full_name": req.full_name.strip(),
        "email": req.email.lower().strip(),
        "password_hash": hash_password(req.password),
        "role": role,
        "balance": 0.0,
        "created_at": now,
        "status": "PENDING_APPROVAL",
        "approved": False,
        "auctions_won": 0,
        "auctions_participated": 0,
        "win_rate": 0.0,
        "total_bids_placed": 0,
        "collector_tier": "ACTIVE"
    }

    res = users_col.insert_one(user_doc)
    user_doc["_id"] = str(res.inserted_id)
    del user_doc["password_hash"]

    # Generate persistent Account Approval Notification for Managers
    notif_id = f"req_{user_doc['username']}_{now}"
    db["notifications"].insert_one({
        "id": notif_id,
        "type": "ACCOUNT_APPROVAL_REQUEST",
        "recipientRole": "MANAGER",
        "title": "Account Registration Request",
        "message": f"{req.full_name.strip()} (@{user_doc['username']}) submitted a new {role} registration request requiring Manager approval.",
        "details": {
            "requester_username": user_doc["username"],
            "requester_name": req.full_name.strip(),
            "requester_email": req.email.lower().strip(),
            "requester_role": role
        },
        "timestamp": now,
        "read": False,
        "actionStatus": "PENDING"
    })

    return {
        "success": True,
        "pending_approval": True,
        "message": f"Registration request submitted! Your {role.lower()} account for @{user_doc['username']} is pending Manager approval. You can log in as soon as a manager reviews and approves your request.",
        "user": user_doc
    }

@router.post("/login", summary="Login with username/email and password")
async def login(req: LoginRequest):
    db = get_db()
    users_col = db["users"]

    query_val = req.username_or_email.lower().strip()
    user_doc = users_col.find_one({
        "$or": [{"username": query_val}, {"email": query_val}]
    })

    if not user_doc or user_doc.get("password_hash") != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    # Validate that the selected role matches the account's registered role
    if req.role:
        selected_role = req.role.upper().strip()
        account_role = (user_doc.get("role") or "CUSTOMER").upper().strip()
        if selected_role != account_role:
            sel_label = "Manager" if selected_role == "MANAGER" else "Customer"
            acc_label = "Manager" if account_role == "MANAGER" else "Customer"
            raise HTTPException(
                status_code=401,
                detail=f"Role mismatch: This account is registered as a {acc_label}. You selected '{sel_label}'. Please select '{acc_label}' role to sign in."
            )

    # Check approval status
    user_status = user_doc.get("status", "ACTIVE")
    if user_status == "PENDING_APPROVAL" or user_doc.get("approved") is False:
        raise HTTPException(
            status_code=403, 
            detail=f"Account @{user_doc.get('username')} is currently pending Manager approval. Please wait for a platform administrator/manager to approve your account before logging in."
        )
    if user_status == "DECLINED":
        raise HTTPException(
            status_code=403,
            detail=f"Account registration request for @{user_doc.get('username')} was declined by the Platform Manager."
        )

    user_doc["_id"] = str(user_doc["_id"])
    del user_doc["password_hash"]

    return {
        "success": True,
        "message": "Login successful!",
        "user": user_doc,
        "token": f"token_{user_doc['username']}_{int(time.time())}"
    }

def enrich_user_with_collector_stats(u: dict, db) -> dict:
    if u.get("role") == "MANAGER":
        u["win_rate"] = 0.0
        u["auctions_won"] = 0
        u["auctions_participated"] = 0
        u["total_bids_placed"] = 0
        u["collector_tier"] = "STAFF"
        return u

    username = u.get("username", "")
    participated_ids = db["bids"].distinct("auction_id", {"bidder": username})
    auctions_participated = len(participated_ids)
    auctions_won = db["auctions"].count_documents({"highest_bidder": username})
    total_bids_placed = db["bids"].count_documents({"bidder": username})

    base_won = u.get("auctions_won", auctions_won)
    base_part = u.get("auctions_participated", max(auctions_participated, base_won))
    win_rate = round((base_won / max(1, base_part)) * 100, 1) if base_part > 0 else 0.0

    if win_rate >= 50.0 and (base_part >= 2 or base_won >= 2):
        tier = "LEGEND"  # Diamond VIP Legend
    elif win_rate >= 35.0 or base_won >= 2:
        tier = "MASTER"  # Platinum Master Collector
    elif win_rate >= 20.0 or base_won >= 1:
        tier = "ELITE"   # Gold Elite Bidder
    else:
        tier = "ACTIVE"  # Silver Active Bidder

    u["win_rate"] = float(u.get("win_rate", win_rate))
    u["auctions_won"] = int(base_won)
    u["auctions_participated"] = int(base_part)
    u["total_bids_placed"] = int(u.get("total_bids_placed", total_bids_placed))
    u["collector_tier"] = str(u.get("collector_tier", tier))
    return u


def extract_username_from_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    token = authorization.replace("Bearer ", "").strip()
    parts = token.split("_")
    if len(parts) < 2 or parts[0] != "token":
        raise HTTPException(status_code=401, detail="Invalid session token.")
    if len(parts) >= 3 and parts[-1].isdigit():
        return "_".join(parts[1:-1])
    return "_".join(parts[1:])


@router.get("/me", summary="Get profile of logged-in user")
async def get_current_user_profile(authorization: Optional[str] = Header(None)):
    username = extract_username_from_token(authorization)
    db = get_db()
    user_doc = db["users"].find_one({"username": username})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found.")

    user_doc["_id"] = str(user_doc["_id"])
    del user_doc["password_hash"]
    return enrich_user_with_collector_stats(user_doc, db)


@router.get("/users", summary="List all platform users with collector stats")
async def list_users():
    db = get_db()
    users = list(db["users"].find({}, {"password_hash": 0}).sort("created_at", -1))
    enriched_users = []
    for u in users:
        u["_id"] = str(u["_id"])
        enriched_users.append(enrich_user_with_collector_stats(u, db))
    return {"total": len(enriched_users), "users": enriched_users}

class UpdateBalanceRequest(BaseModel):
    balance: float = Field(..., ge=0)

@router.put("/users/{username}/balance", summary="Update user account balance")
async def update_user_balance(username: str, req: UpdateBalanceRequest):
    db = get_db()
    res = db["users"].find_one_and_update(
        {"username": username.lower().strip()},
        {"$set": {"balance": float(req.balance)}},
        projection={"password_hash": 0},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="User not found.")
    res["_id"] = str(res["_id"])
    return {"success": True, "message": f"Balance updated to ${req.balance:,.2f}", "user": res}

class UpdateRoleRequest(BaseModel):
    role: str = Field(..., example="MANAGER")

@router.put("/users/{username}/role", summary="Update user role")
async def update_user_role(username: str, req: UpdateRoleRequest):
    role = req.role.upper().strip()
    if role not in ["CUSTOMER", "MANAGER"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be CUSTOMER or MANAGER.")
    
    db = get_db()
    res = db["users"].find_one_and_update(
        {"username": username.lower().strip()},
        {"$set": {"role": role}},
        projection={"password_hash": 0},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="User not found.")
    res["_id"] = str(res["_id"])
    return {"success": True, "message": f"Role updated to {role}", "user": res}

@router.delete("/users/{username}", summary="Delete user account")
async def delete_user(username: str):
    db = get_db()
    target = username.lower().strip()
    res = db["users"].delete_one({"username": target})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"success": True, "message": f"User '{username}' deleted successfully."}

