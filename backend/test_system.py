"""
Automated Verification & Concurrency Stress Test Suite for NovaAuction.

Usage:
  python backend/test_system.py          # Runs unit tests + live tests (if services are online)
  python backend/test_system.py --unit   # Runs offline unit & mocked concurrency checks only
  python backend/test_system.py --live   # Requires MongoDB, Shards, and Gateway running on localhost:8000
"""

import os
import sys
import time
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure project root & backend paths are importable
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
for p in [ROOT_DIR, CURRENT_DIR, os.path.join(CURRENT_DIR, "gateway"), os.path.join(CURRENT_DIR, "shard")]:
    if p not in sys.path:
        sys.path.insert(0, p)


class MockAuctionCollection:
    """Thread-safe in-memory mock of MongoDB find_one_and_update to verify atomic guard logic."""
    def __init__(self, initial_doc: dict):
        self.lock = threading.Lock()
        self.doc = dict(initial_doc)

    def find_one(self, query: dict):
        with self.lock:
            if query.get("_id") == self.doc.get("_id"):
                return dict(self.doc)
            return None

    def update_one(self, query: dict, update: dict):
        with self.lock:
            if query.get("_id") == self.doc.get("_id") and "$set" in update:
                self.doc.update(update["$set"])

    def find_one_and_update(self, query: dict, update: dict, return_document=None):
        with self.lock:
            if (
                query.get("_id") == self.doc.get("_id")
                and self.doc.get("status") == query.get("status")
                and self.doc.get("end_time", 0) > query.get("end_time", {}).get("$gt", 0)
                and self.doc.get("current_price", 0.0) < query.get("current_price", {}).get("$lt", 0.0)
            ):
                if "$set" in update:
                    self.doc.update(update["$set"])
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        self.doc[k] = self.doc.get(k, 0) + v
                return dict(self.doc)
            return None


class MockInsertCollection:
    def __init__(self):
        self.lock = threading.Lock()
        self.items = []

    def insert_one(self, doc: dict):
        with self.lock:
            copy_doc = dict(doc)
            copy_doc["_id"] = f"mock_{len(self.items) + 1}"
            self.items.append(copy_doc)
            class Result:
                inserted_id = copy_doc["_id"]
            return Result()


class OfflineSystemTests(unittest.TestCase):
    def test_01_protobuf_contract_imports(self):
        from backend.gateway.generated import auction_pb2 as gw_pb2
        from backend.shard.generated import auction_pb2 as sh_pb2

        req = gw_pb2.PlaceBidRequest(auction_id="auc_1", bidder="alice_collector", amount=500.0, shard_id=1)
        raw = req.SerializeToString()
        parsed = sh_pb2.PlaceBidRequest()
        parsed.ParseFromString(raw)
        self.assertEqual(parsed.auction_id, "auc_1")
        self.assertEqual(parsed.bidder, "alice_collector")
        self.assertEqual(parsed.amount, 500.0)
        self.assertEqual(parsed.shard_id, 1)

    def test_02_consistent_shard_routing(self):
        from backend.gateway.grpc_client import GrpcShardClientPool
        pool = GrpcShardClientPool()
        shard_a = pool.get_shard_id_for_auction("65f1a2b3c4d5e6f7a8b9c0d1")
        shard_b = pool.get_shard_id_for_auction("65f1a2b3c4d5e6f7a8b9c0d1")
        self.assertEqual(shard_a, shard_b)
        self.assertIn(shard_a, [1, 2])

        # Verify distribution across multiple IDs hits both shards
        assigned = {pool.get_shard_id_for_auction(f"auction_{i}") for i in range(50)}
        self.assertEqual(assigned, {1, 2})

    def test_03_token_parsing_with_underscores(self):
        from unittest.mock import MagicMock, patch
        from backend.gateway.routes import auth

        self.assertEqual(
            auth.extract_username_from_token("Bearer token_alice_collector_1730000000"),
            "alice_collector"
        )
        self.assertEqual(
            auth.extract_username_from_token("Bearer token_admin_manager_1730000000"),
            "admin_manager"
        )

        mock_db = MagicMock()
        mock_db["users"].find_one.return_value = {
            "_id": "u1",
            "username": "alice_collector",
            "full_name": "Alice Morgan",
            "email": "alice@gmail.com",
            "password_hash": "hash",
            "role": "CUSTOMER",
            "balance": 1000.0,
            "auctions_won": 2,
            "auctions_participated": 4,
            "total_bids_placed": 10,
            "collector_tier": "LEGEND"
        }
        mock_db["bids"].distinct.return_value = ["a1", "a2"]
        mock_db["auctions"].count_documents.return_value = 2
        mock_db["bids"].count_documents.return_value = 10

        with patch.object(auth, "get_db", return_value=mock_db):
            coro = auth.get_current_user_profile("Bearer token_alice_collector_1730000000")
            try:
                coro.send(None)
                self.fail("Expected coroutine to return without suspending")
            except StopIteration as stop:
                res = stop.value
            mock_db["users"].find_one.assert_called_with({"username": "alice_collector"})
            self.assertEqual(res["username"], "alice_collector")

    def test_04_atomic_bid_concurrency_50_threads(self):
        from backend.shard.db import Database

        # Construct Database instance bypassing live MongoClient connection
        db_obj = Database.__new__(Database)
        now = int(time.time() * 1000)
        db_obj.auctions = MockAuctionCollection({
            "_id": "test_auc_1",
            "title": "Concurrency Stress Item",
            "category": "Jewelry",
            "start_price": 100.0,
            "current_price": 100.0,
            "highest_bidder": "",
            "start_time": now - 10000,
            "end_time": now + 3600000,
            "status": "ACTIVE",
            "shard_id": 1,
            "total_bids": 0,
        })
        db_obj.bids = MockInsertCollection()
        db_obj.events = MockInsertCollection()

        bid_amounts = [100.0 + (i + 1) * 10.0 for i in range(50)]
        results = []

        with ThreadPoolExecutor(max_workers=16) as executor:
            futures = [
                executor.submit(db_obj.place_bid, "test_auc_1", f"bidder_{idx}", amt, 1)
                for idx, amt in enumerate(bid_amounts)
            ]
            for f in as_completed(futures):
                results.append(f.result())

        accepted = [r for r in results if r.get("success")]
        rejected = [r for r in results if not r.get("success")]

        self.assertGreaterEqual(len(accepted), 1)
        self.assertEqual(len(accepted) + len(rejected), 50)

        final_doc = db_obj.auctions.doc
        self.assertEqual(final_doc["total_bids"], len(accepted))
        self.assertEqual(len(db_obj.bids.items), len(accepted))
        # The highest accepted bid must strictly equal the final auction price
        max_accepted = max(r["current_price"] for r in accepted)
        self.assertEqual(final_doc["current_price"], max_accepted)

    def test_05_notifications_outbid_lookup_uses_object_id(self):
        from unittest.mock import MagicMock, patch
        from bson import ObjectId
        from backend.gateway.routes import notifications

        oid = ObjectId()
        class FakeCursor(list):
            def sort(self, *args, **kwargs):
                return self
            def limit(self, *args, **kwargs):
                return self

        mock_db = MagicMock()
        cols = {
            "notifications": MagicMock(),
            "auctions": MagicMock(),
            "users": MagicMock(),
            "bids": MagicMock(),
        }
        mock_db.__getitem__.side_effect = lambda name: cols[name]
        cols["notifications"].find.return_value = FakeCursor([])
        cols["auctions"].find.return_value = FakeCursor([])
        cols["users"].find_one.return_value = {"username": "alice_collector", "collector_tier": "LEGEND", "win_rate": 70.0, "auctions_won": 3}
        cols["bids"].find.return_value = FakeCursor([{"auction_id": str(oid), "bidder": "alice_collector", "timestamp": int(time.time() * 1000)}])
        cols["auctions"].find_one.return_value = {"_id": oid, "title": "Test Lot", "status": "ACTIVE", "highest_bidder": "bob_trader", "current_price": 500.0}

        with patch.object(notifications, "get_db", return_value=mock_db):
            coro = notifications.get_notifications(username="alice_collector", role="CUSTOMER")
            try:
                coro.send(None)
                self.fail("Expected coroutine return")
            except StopIteration as stop:
                res = stop.value

        cols["auctions"].find_one.assert_called_with({"_id": oid})
        notif_types = {n["type"] for n in res["notifications"]}
        self.assertIn("BID_OUTBID", notif_types)
        self.assertIn("LEVEL_ACHIEVED", notif_types)

    def test_06_end_auction_json_serializable_and_notifs_aligned(self):
        import json
        from unittest.mock import MagicMock
        from bson import ObjectId
        from backend.gateway.grpc_client import GrpcShardClientPool

        oid = ObjectId()
        pool = GrpcShardClientPool()
        mock_db = MagicMock()
        cols = {
            "auctions": MagicMock(),
            "users": MagicMock(),
            "notifications": MagicMock(),
            "events": MagicMock(),
        }
        mock_db.__getitem__.side_effect = lambda name: cols[name]
        pool._get_db = lambda: mock_db

        # Case 1: Already ENDED auction must be JSON serializable (no ObjectId _id)
        cols["auctions"].find_one.return_value = {
            "_id": oid,
            "title": "Ended Lot",
            "status": "ENDED",
            "current_price": 1000.0,
            "highest_bidder": "alice_collector",
        }
        res_already = pool.end_auction(str(oid), "admin_manager")
        self.assertTrue(res_already["success"])
        json.dumps(res_already)  # Must not raise TypeError for ObjectId

        # Case 2: Active auction concluded early emits aligned notifications and auctions_won
        cols["auctions"].find_one.return_value = {
            "_id": oid,
            "title": "Live Diamond Lot",
            "status": "ACTIVE",
            "current_price": 2500.0,
            "highest_bidder": "alice_collector",
        }
        cols["auctions"].find_one_and_update.return_value = {
            "_id": oid,
            "title": "Live Diamond Lot",
            "status": "ENDED",
            "current_price": 2500.0,
            "highest_bidder": "alice_collector",
            "total_bids": 5,
        }
        res_ended = pool.end_auction(str(oid), "admin_manager")
        self.assertTrue(res_ended["success"])
        json.dumps(res_ended)
        cols["users"].update_one.assert_called_with(
            {"username": "alice_collector"},
            {"$inc": {"auctions_won": 1}},
        )
        inserted_notifs = [c.args[0] for c in cols["notifications"].insert_one.call_args_list]
        self.assertEqual(len(inserted_notifs), 2)
        self.assertEqual(inserted_notifs[0]["recipientUsername"], "alice_collector")
        self.assertEqual(inserted_notifs[1]["recipientRole"], "MANAGER")


def run_live_tests(gateway_url: str = "http://localhost:8000") -> bool:
    import requests

    print(f"\n[*] Running Live Integration & 50-Concurrent-Bid Stress Test against {gateway_url}...")
    try:
        health = requests.get(f"{gateway_url}/api/health", timeout=3)
        health.raise_for_status()
        print(f"[OK] Gateway Health: {health.json()}")
    except Exception as e:
        print(f"[!] Gateway not reachable at {gateway_url}: {e}")
        return False

    # 1. Create temporary test auction
    create_resp = requests.post(
        f"{gateway_url}/api/auctions",
        json={
            "title": "Automated Concurrency Test Lot",
            "description": "Created by test_system.py to verify atomic gRPC sharded bidding.",
            "category": "Jewelry",
            "start_price": 100.0,
            "duration_seconds": 300,
        },
        timeout=5,
    )
    if create_resp.status_code != 200:
        print(f"[FAIL] Could not create test auction: {create_resp.text}")
        return False

    auction = create_resp.json()
    auction_id = auction["id"]
    print(f"[OK] Created test auction {auction_id} on Shard {auction.get('shard_id')}")

    # 2. Fire 50 concurrent bids using seeded elite collector 'alice_collector'
    def send_bid(amount: float):
        return requests.post(
            f"{gateway_url}/api/auctions/{auction_id}/bid",
            json={"bidder": "alice_collector", "amount": amount},
            timeout=10,
        )

    bid_values = [100.0 + (i + 1) * 25.0 for i in range(50)]
    accepted = []
    rejected = []

    with ThreadPoolExecutor(max_workers=20) as pool:
        futs = [pool.submit(send_bid, val) for val in bid_values]
        for fut in as_completed(futs):
            resp = fut.result()
            if resp.status_code == 200 and resp.json().get("success"):
                accepted.append(resp.json()["current_price"])
            else:
                rejected.append(resp.status_code)

    final_auction = requests.get(f"{gateway_url}/api/auctions/{auction_id}", timeout=5).json()
    expected_max = max(accepted) if accepted else 100.0

    print(f"[OK] 50 concurrent bids processed -> Accepted: {len(accepted)} | Rejected (stale price): {len(rejected)}")
    print(f"[OK] Final Price: {final_auction['current_price']} | Expected Max Accepted: {expected_max}")
    print(f"[OK] Total Bids Recorded: {final_auction['total_bids']}")

    assert final_auction["current_price"] == expected_max, "Race condition detected in final price!"
    assert final_auction["total_bids"] == len(accepted), "Mismatch between accepted count and stored total_bids!"
    print("[OK] Zero race conditions detected. Atomic gRPC + MongoDB concurrency verified!")
    return True


if __name__ == "__main__":
    mode_unit = "--unit" in sys.argv
    mode_live = "--live" in sys.argv

    print("=======================================================")
    print("  NovaAuction Automated Verification & Test Suite")
    print("=======================================================")

    suite = unittest.defaultTestLoader.loadTestsFromTestCase(OfflineSystemTests)
    runner = unittest.TextTestRunner(verbosity=2)
    unit_result = runner.run(suite)

    if not unit_result.wasSuccessful():
        sys.exit(1)

    if mode_unit:
        sys.exit(0)

    if mode_live:
        ok = run_live_tests()
        sys.exit(0 if ok else 1)
    else:
        # Try live tests opportunistically if services are running
        try:
            import requests
            r = requests.get("http://localhost:8000/api/health", timeout=1.5)
            if r.status_code == 200:
                ok = run_live_tests()
                sys.exit(0 if ok else 1)
        except Exception:
            print("\n[INFO] Live services not running on localhost:8000; offline unit & concurrency tests passed.")
            print("[INFO] Run 'python backend/test_system.py --live' once Docker or start_all.bat is running.")
        sys.exit(0)
