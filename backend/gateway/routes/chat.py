import os
import time
import random
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo import MongoClient

router = APIRouter(prefix="/api/chat", tags=["Chat"])

_mongo_client: Optional[MongoClient] = None

def get_db():
    global _mongo_client
    if _mongo_client is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _mongo_client = MongoClient(mongo_uri)
    return _mongo_client["auction_db"]

class SendMessageRequest(BaseModel):
    sender_username: str = Field(..., description="Username of sender")
    sender_role: str = Field(..., description="CUSTOMER or MANAGER")
    sender_name: Optional[str] = None
    recipient_username: Optional[str] = None
    customer_username: Optional[str] = None
    content: str = Field(..., min_length=1, description="Message text content")

class MarkReadRequest(BaseModel):
    customer_username: str
    role: str

@router.get("/conversations", summary="Get chat conversation list")
async def get_conversations(
    username: Optional[str] = Query(None),
    role: Optional[str] = Query("CUSTOMER")
):
    db = get_db()
    current_username = (username or "").lower().strip()
    current_role = (role or "CUSTOMER").upper().strip()

    if current_role == "MANAGER":
        # Managers see all customer threads
        customers = list(db["users"].find({"role": "CUSTOMER"}).sort("username", 1))
        
        conversations = []
        for cust in customers:
            c_username = cust["username"]
            conv_id = f"conv_{c_username}"
            
            # Find last message in this conversation
            last_msg = db["messages"].find_one(
                {"conversation_id": conv_id},
                sort=[("timestamp", -1)]
            )
            
            # Count unread messages sent by customer to manager
            unread_count = db["messages"].count_documents({
                "conversation_id": conv_id,
                "sender_role": "CUSTOMER",
                "read": False
            })
            
            conversations.append({
                "conversation_id": conv_id,
                "customer_username": c_username,
                "customer_name": cust.get("full_name", c_username),
                "customer_email": cust.get("email", ""),
                "customer_tier": cust.get("collector_tier", "ACTIVE"),
                "customer_win_rate": cust.get("win_rate", 0.0),
                "last_message": last_msg.get("content") if last_msg else None,
                "last_message_time": last_msg.get("timestamp") if last_msg else cust.get("created_at", 0),
                "unread_count": unread_count
            })
            
        # Sort conversations with active messages first, sorted by last_message_time descending
        conversations.sort(
            key=lambda x: (1 if x["last_message"] else 0, x["last_message_time"] or 0),
            reverse=True
        )
        return {"conversations": conversations}

    else:
        # Customer only sees their single conversation with Manager / Support
        if not current_username:
            raise HTTPException(status_code=400, detail="Username is required for customer conversations.")
        
        conv_id = f"conv_{current_username}"
        user_doc = db["users"].find_one({"username": current_username})
        
        last_msg = db["messages"].find_one(
            {"conversation_id": conv_id},
            sort=[("timestamp", -1)]
        )
        unread_count = db["messages"].count_documents({
            "conversation_id": conv_id,
            "sender_role": "MANAGER",
            "read": False
        })
        
        return {
            "conversations": [{
                "conversation_id": conv_id,
                "customer_username": current_username,
                "customer_name": user_doc.get("full_name", current_username) if user_doc else current_username,
                "customer_tier": user_doc.get("collector_tier", "ACTIVE") if user_doc else "ACTIVE",
                "last_message": last_msg.get("content") if last_msg else None,
                "last_message_time": last_msg.get("timestamp") if last_msg else int(time.time() * 1000),
                "unread_count": unread_count
            }]
        }


@router.get("/messages", summary="Get message history for a conversation")
async def get_messages(
    customer_username: str = Query(...),
    username: Optional[str] = Query(None),
    role: Optional[str] = Query("CUSTOMER")
):
    db = get_db()
    c_username = customer_username.lower().strip()
    current_username = (username or "").lower().strip()
    current_role = (role or "CUSTOMER").upper().strip()

    # If role is CUSTOMER, they can ONLY view their own conversation
    if current_role == "CUSTOMER" and current_username != c_username:
        raise HTTPException(status_code=403, detail="Access denied. Customers can only view their own support messages.")

    conv_id = f"conv_{c_username}"
    messages = list(db["messages"].find({"conversation_id": conv_id}).sort("timestamp", 1))
    
    for m in messages:
        m["_id"] = str(m["_id"])
        
    return {
        "conversation_id": conv_id,
        "customer_username": c_username,
        "messages": messages
    }


@router.post("/send", summary="Send a chat message")
async def send_message(req: SendMessageRequest):
    db = get_db()
    sender_u = req.sender_username.lower().strip()
    sender_role = req.sender_role.upper().strip()
    content = req.content.strip()

    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    sender_doc = db["users"].find_one({"username": sender_u})
    sender_display_name = req.sender_name or (sender_doc.get("full_name") if sender_doc else sender_u)

    if sender_role == "CUSTOMER":
        customer_u = sender_u
        recipient_u = "MANAGER_SUPPORT"
    else: # MANAGER
        customer_u = (req.customer_username or req.recipient_username or "").lower().strip()
        if not customer_u:
            raise HTTPException(status_code=400, detail="Customer username is required for manager direct messages.")
        recipient_u = customer_u

    conv_id = f"conv_{customer_u}"
    now_ms = int(time.time() * 1000)

    msg_doc = {
        "id": f"msg_{now_ms}_{random.randint(100, 999)}",
        "conversation_id": conv_id,
        "customer_username": customer_u,
        "sender_username": sender_u,
        "sender_name": sender_display_name,
        "sender_role": sender_role,
        "recipient_username": recipient_u,
        "content": content,
        "timestamp": now_ms,
        "read": False
    }

    res = db["messages"].insert_one(msg_doc)
    msg_doc["_id"] = str(res.inserted_id)

    return {"success": True, "message": msg_doc}


@router.post("/mark-read", summary="Mark conversation messages as read")
async def mark_read(req: MarkReadRequest):
    db = get_db()
    c_username = req.customer_username.lower().strip()
    role = req.role.upper().strip()
    conv_id = f"conv_{c_username}"

    if role == "MANAGER":
        # Manager reading customer messages
        result = db["messages"].update_many(
            {"conversation_id": conv_id, "sender_role": "CUSTOMER", "read": False},
            {"$set": {"read": True}}
        )
    else:
        # Customer reading manager messages
        result = db["messages"].update_many(
            {"conversation_id": conv_id, "sender_role": "MANAGER", "read": False},
            {"$set": {"read": True}}
        )

    return {"success": True, "modified_count": result.modified_count}


@router.get("/unread-count", summary="Get total unread message count")
async def get_unread_count(
    username: Optional[str] = Query(None),
    role: Optional[str] = Query("CUSTOMER")
):
    db = get_db()
    current_username = (username or "").lower().strip()
    current_role = (role or "CUSTOMER").upper().strip()

    if current_role == "MANAGER":
        # Total unread customer messages across all conversations
        count = db["messages"].count_documents({
            "sender_role": "CUSTOMER",
            "read": False
        })
    else:
        if not current_username:
            return {"unread_count": 0}
        conv_id = f"conv_{current_username}"
        count = db["messages"].count_documents({
            "conversation_id": conv_id,
            "sender_role": "MANAGER",
            "read": False
        })

    return {"unread_count": count}
