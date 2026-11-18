import os
import sys
from contextlib import asynccontextmanager

# Add paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
root_dir = os.path.dirname(backend_dir)
for p in [current_dir, backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

try:
    from backend.gateway.routes.auth import router as auth_router
    from backend.gateway.routes.auctions import router as auctions_router
    from backend.gateway.routes.analytics import router as analytics_router
    from backend.gateway.routes.notifications import router as notifications_router
    from backend.gateway.routes.chat import router as chat_router
    from backend.gateway.websocket_manager import ws_manager
except ImportError:
    from routes.auth import router as auth_router
    from routes.auctions import router as auctions_router
    from routes.analytics import router as analytics_router
    from routes.notifications import router as notifications_router
    from routes.chat import router as chat_router
    from websocket_manager import ws_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== [FastAPI Gateway] Distributed Auction Gateway Starting Up ===")
    if os.getenv("AUTO_SEED_IF_EMPTY", "false").lower() == "true":
        try:
            from database.seed import seed_if_empty
            seed_if_empty()
        except Exception as e:
            print(f"[Gateway] Auto-seed check skipped or failed: {e}")
    yield
    print("=== [FastAPI Gateway] Distributed Auction Gateway Shutting Down ===")

app = FastAPI(
    title="NovaAuction API Gateway",
    description="Distributed Auction API Gateway with gRPC, MongoDB, WebSockets, Role-Based Auth, and PySpark analytics.",
    version="2.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount items_photo directory from frontend/public or root if present
for candidate_path in [
    os.path.join(root_dir, "frontend", "public", "items_photo"),
    os.path.join(root_dir, "items_photo"),
]:
    if os.path.exists(candidate_path):
        app.mount("/items_photo", StaticFiles(directory=candidate_path), name="items_photo")
        break

# Include all route modules
app.include_router(auth_router)
app.include_router(auctions_router)
app.include_router(analytics_router)
app.include_router(notifications_router)
app.include_router(chat_router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "service": "FastAPI gRPC Gateway",
        "version": "2.1.0"
    }


# WebSocket endpoint for specific auction room
@app.websocket("/ws/auctions/{auction_id}")
async def websocket_auction_endpoint(websocket: WebSocket, auction_id: str):
    await ws_manager.connect_auction(websocket, auction_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect_auction(websocket, auction_id)
    except Exception:
        ws_manager.disconnect_auction(websocket, auction_id)


# WebSocket endpoint for global live feed
@app.websocket("/ws/live")
async def websocket_global_endpoint(websocket: WebSocket):
    await ws_manager.connect_global(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"[*] Starting FastAPI Gateway on port {port} with auto-reload...")
    # Use string target for uvicorn reload capability
    target_app = "backend.gateway.main:app" if os.path.exists("backend") else "main:app"
    uvicorn.run(target_app, host="0.0.0.0", port=port, reload=True)
