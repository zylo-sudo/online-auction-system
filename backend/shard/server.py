import os
import sys
import time
from concurrent import futures
import grpc

# Add local path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import Database
from generated import auction_pb2, auction_pb2_grpc


def doc_to_proto_auction(doc: dict) -> auction_pb2.Auction:
    if not doc:
        return auction_pb2.Auction()
    return auction_pb2.Auction(
        id=str(doc.get("_id", "")),
        title=str(doc.get("title", "")),
        description=str(doc.get("description", "")),
        category=str(doc.get("category", "General")),
        start_price=float(doc.get("start_price", 0.0)),
        current_price=float(doc.get("current_price", 0.0)),
        highest_bidder=str(doc.get("highest_bidder", "")),
        start_time=int(doc.get("start_time", 0)),
        end_time=int(doc.get("end_time", 0)),
        status=str(doc.get("status", "ACTIVE")),
        shard_id=int(doc.get("shard_id", 1)),
        total_bids=int(doc.get("total_bids", 0)),
        image_url=str(doc.get("image_url", ""))
    )


def doc_to_proto_bid(doc: dict) -> auction_pb2.Bid:
    if not doc:
        return auction_pb2.Bid()
    return auction_pb2.Bid(
        id=str(doc.get("_id", "")),
        auction_id=str(doc.get("auction_id", "")),
        bidder=str(doc.get("bidder", "")),
        amount=float(doc.get("amount", 0.0)),
        timestamp=int(doc.get("timestamp", 0)),
        shard_id=int(doc.get("shard_id", 1))
    )


class AuctionShardService(auction_pb2_grpc.AuctionShardServiceServicer):
    def __init__(self, shard_id: int, db: Database):
        self.shard_id = shard_id
        self.db = db

    def CreateAuction(self, request, context):
        try:
            doc = self.db.create_auction(
                title=request.title,
                description=request.description,
                category=request.category,
                start_price=request.start_price,
                duration_seconds=request.duration_seconds or 600,
                shard_id=self.shard_id,
                image_url=request.image_url or ""
            )
            return doc_to_proto_auction(doc)
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return auction_pb2.Auction()

    def GetAuction(self, request, context):
        try:
            doc = self.db.get_auction(request.auction_id)
            if not doc:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details("Auction not found")
                return auction_pb2.Auction()
            return doc_to_proto_auction(doc)
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return auction_pb2.Auction()

    def PlaceBid(self, request, context):
        try:
            res = self.db.place_bid(
                auction_id=request.auction_id,
                bidder=request.bidder,
                amount=request.amount,
                shard_id=self.shard_id
            )
            updated_proto = doc_to_proto_auction(res.get("updated_auction", {}))
            return auction_pb2.BidResponse(
                success=res.get("success", False),
                message=res.get("message", ""),
                current_price=float(res.get("current_price", 0.0)),
                highest_bidder=str(res.get("highest_bidder", "")),
                timestamp=int(res.get("timestamp", int(time.time() * 1000))),
                updated_auction=updated_proto
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return auction_pb2.BidResponse(success=False, message=str(e))

    def ListBids(self, request, context):
        try:
            limit = request.limit if request.limit > 0 else 50
            bids = self.db.list_bids(request.auction_id, limit=limit)
            return auction_pb2.BidListResponse(
                bids=[doc_to_proto_bid(b) for b in bids]
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return auction_pb2.BidListResponse()

    def ListAuctions(self, request, context):
        try:
            limit = request.limit if request.limit > 0 else 100
            status = request.status if request.status else None
            auctions = self.db.list_auctions(shard_id=self.shard_id, status=status, limit=limit)
            return auction_pb2.AuctionListResponse(
                auctions=[doc_to_proto_auction(a) for a in auctions]
            )
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return auction_pb2.AuctionListResponse()


def serve():
    import argparse
    parser = argparse.ArgumentParser(description="Auction Shard Server")
    parser.add_argument("--shard-id", type=int, default=int(os.getenv("SHARD_ID", "1")), help="Shard ID (1 or 2)")
    parser.add_argument("--port", type=str, default=os.getenv("PORT", "50051"), help="Port to listen on")
    parser.add_argument("--mongo-uri", type=str, default=os.getenv("MONGO_URI", "mongodb://localhost:27017"), help="MongoDB URI")
    args = parser.parse_args()

    shard_id = args.shard_id
    port = args.port
    mongo_uri = args.mongo_uri
    
    print(f"[*] Initializing Shard {shard_id} connected to {mongo_uri}...")
    db = Database(mongo_uri=mongo_uri)
    
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=20))
    auction_pb2_grpc.add_AuctionShardServiceServicer_to_server(
        AuctionShardService(shard_id=shard_id, db=db),
        server
    )
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"[OK] Auction Shard {shard_id} running on gRPC port {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
