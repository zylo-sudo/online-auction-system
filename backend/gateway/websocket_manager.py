import json
from typing import Dict, Set, Any
from fastapi import WebSocket

class WebSocketManager:
    def __init__(self):
        self.auction_rooms: Dict[str, Set[WebSocket]] = {}
        self.global_subscribers: Set[WebSocket] = set()

    async def connect_auction(self, websocket: WebSocket, auction_id: str):
        await websocket.accept()
        if auction_id not in self.auction_rooms:
            self.auction_rooms[auction_id] = set()
        self.auction_rooms[auction_id].add(websocket)

    def disconnect_auction(self, websocket: WebSocket, auction_id: str):
        if auction_id in self.auction_rooms:
            self.auction_rooms[auction_id].discard(websocket)
            if not self.auction_rooms[auction_id]:
                del self.auction_rooms[auction_id]

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_subscribers.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_subscribers.discard(websocket)

    async def broadcast_to_auction(self, auction_id: str, message: Dict[str, Any]):
        payload = json.dumps(message)
        
        if auction_id in self.auction_rooms:
            dead_sockets = set()
            for ws in self.auction_rooms[auction_id]:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.auction_rooms[auction_id].discard(ws)

        dead_global = set()
        for ws in self.global_subscribers:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_global.add(ws)
        for ws in dead_global:
            self.global_subscribers.discard(ws)

    async def broadcast_live(self, message: Dict[str, Any]):
        payload = json.dumps(message)
        dead_global = set()
        for ws in self.global_subscribers:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_global.add(ws)
        for ws in dead_global:
            self.global_subscribers.discard(ws)

ws_manager = WebSocketManager()
