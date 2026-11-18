# NOVA — Sharded Real-Time Distributed Auction System

A modern, high-performance, real-time distributed auction and live bidding platform built with microservices and distributed computing principles (**React 18 + FastAPI + gRPC + MongoDB + Analytics + Docker**).

---

## ✨ Key Features

- **Sharded gRPC Microservices:** Auction operations are partitioned across multiple gRPC shard workers (`Shard 1`, `Shard 2`) using consistent MD5 hashing over Protocol Buffers (`proto/auction.proto`).
- **Atomic Bid Concurrency:** Race conditions under high-concurrency bidding are prevented via MongoDB conditional atomic updates (`find_one_and_update` with `current_price < amount` and active time-window guards).
- **Real-Time WebSockets Hub:** Live bid feeds, auction creation, and manager-concluded hammer-down events stream instantly to all connected clients (`/ws/live` and `/ws/auctions/{id}`).
- **Role-Based Platform Workflows:**
  - **Customer / Collector:** Browse auctions, track collector tiers (`ACTIVE`, `ELITE`, `MASTER`, `LEGEND`), place real-time bids with wallet balance validation, view personalized recommendations, and chat with concierge support.
  - **Platform Manager:** Approve/decline new account registrations, manage user wallet balances & roles, launch new auction lots, hammer-down (conclude) auctions early, monitor shill-bidding/anomaly alerts, and respond to customer inquiries.
- **Automated Analytics Pipeline:** Batch analytics compute trending velocity scores, category-based user recommendations, and shill-bidding/price-spike fraud alerts into MongoDB.
- **Containerized Deployment:** Full multi-container orchestration with Docker Compose and Nginx reverse proxy.

---

## 📁 Project Structure

```
.
├── frontend/                        # React 18 + TypeScript + Vite + TailwindCSS UI
│   ├── public/items_photo/          # Curated luxury auction item photography
│   ├── src/
│   │   ├── components/              # Live Bidding Room, Analytics, Chat, Admin & Auth UI
│   │   ├── services/                # REST API, WebSocket Client & Currency Helpers
│   │   └── types.ts                 # TypeScript Interfaces
│   ├── package.json
│   └── vite.config.ts
├── backend/                         # FastAPI Gateway & Distributed gRPC Shards
│   ├── gateway/                     # FastAPI ASGI Server, WebSocket Hub & Shard Router
│   │   ├── routes/                  # /api/auth, /api/auctions, /api/analytics, /api/chat, /api/notifications
│   │   ├── generated/               # Compiled Python gRPC/Protobuf stubs
│   │   ├── grpc_client.py           # gRPC Connection Pool & Consistent Hashing Router
│   │   ├── websocket_manager.py     # Real-time WebSocket Room & Global Feed Hub
│   │   └── main.py                  # FastAPI Entrypoint
│   ├── shard/                       # gRPC Auction Shard Workers
│   │   ├── generated/               # Compiled Python gRPC/Protobuf stubs
│   │   ├── server.py                # gRPC Server Implementation
│   │   └── db.py                    # MongoDB Atomic Concurrency Operations
│   ├── requirements.txt             # Python Backend Dependencies
│   └── test_system.py               # Automated Unit & 50-Bid Concurrency Verification Suite
├── database/                        # MongoDB Initialization & Seed Scripts
│   ├── init_mongo.js                # Collection & Index Setup
│   ├── seed.py                      # Demo Data Seeder (30 Items, Users, Bids, Chats)
│   └── README.md                    # Data Dictionary & Concurrency Documentation
├── proto/                           # Protocol Buffers Contract
│   └── auction.proto                # Strongly-typed gRPC Service & Message Specs
├── analytics/                       # Batch Analytics Engine
│   ├── spark_trending.py            # Trending Velocity & Price Surge Computation
│   ├── spark_recommendations.py     # Personalized Category Recommendations
│   ├── spark_fraud_detection.py     # High-Frequency Bidding & Price Spike Anomaly Scanner
│   ├── run_all.py                   # Master Analytics Pipeline Runner
│   └── requirements.txt             # Analytics Dependencies
├── docker/                          # Dockerfiles & Nginx Reverse Proxy Config
│   ├── docker-compose.yml
│   ├── Dockerfile.frontend
│   ├── Dockerfile.gateway
│   ├── Dockerfile.shard
│   ├── Dockerfile.analytics
│   └── nginx.conf
├── docker-compose.yml               # Root Docker Compose Orchestrator
├── generate_proto.py                # Protobuf Python Compiler Script
├── start_all.bat                    # Windows One-Click Local Launcher
├── stop_all.bat                     # Windows Local Service Stopper
├── .env.example                     # Environment Variable Reference
└── README.md
```

---

## 🏛️ System Architecture

```
[React 18 Frontend] (Port 3000)
       ↕ (HTTP REST & WebSockets)
[FastAPI Gateway] (Port 8000)
       ↕ (gRPC over HTTP/2)
┌──────────────┴──────────────┐
▼                             ▼
[Auction Shard 1] (50051)   [Auction Shard 2] (50052)
└──────────────┬──────────────┘
       ↕ (Atomic Concurrency)
[MongoDB Database] (Port 27017)
       ↕ (Batch Analytics)
[Analytics Engine]
```

---

## 🚀 How to Run

### Option 1: Docker Compose (Recommended)
```bash
docker compose up -d --build
```
The gateway automatically seeds the database on first boot (`AUTO_SEED_IF_EMPTY=true`).

- **React Web UI:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Option 2: Running Locally (Windows / PowerShell)

1. **Install Prerequisites:** Python 3.11+, Node.js 18+, and MongoDB running on `localhost:27017` (e.g., `docker run -d -p 27017:27017 --name mongodb mongo:7.0`).
2. **Install Dependencies:**
   ```powershell
   pip install -r backend/requirements.txt
   pip install pandas
   cd frontend; npm install; cd ..
   ```
3. **One-Click Launch (Windows):**
   Double-click or run `start_all.bat` (seeds MongoDB and starts Shard 1, Shard 2, FastAPI Gateway, Analytics daemon, and Vite Frontend). Use `stop_all.bat` to stop all services.

   *Or run each service manually in separate terminals:*
   - **Seed DB:** `python database/seed.py`
   - **Shard 1:** `cd backend/shard; $env:SHARD_ID="1"; $env:PORT="50051"; python server.py`
   - **Shard 2:** `cd backend/shard; $env:SHARD_ID="2"; $env:PORT="50052"; python server.py`
   - **Gateway:** `cd backend/gateway; $env:SHARD_HOSTS="localhost:50051,localhost:50052"; python main.py`
   - **Analytics:** `cd analytics; python run_all.py`
   - **Frontend:** `cd frontend; npm run dev`

---

## 🔑 Demo Accounts (Seeded Data)

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Platform Manager** | `admin_manager` | `password123` | Approves accounts, creates/ends lots, views fraud alerts |
| **VIP Collector** | `alice_collector` | `password123` | Diamond VIP Legend (10,000,000 Units wallet balance) |
| **Master Collector** | `bob_trader` | `password123` | Platinum Master Collector (2,500,000 Units balance) |
| **Starter Account** | `bhone` | `password123` | 0 Units balance (demonstrates balance top-up workflow) |

> **Platform Currency Note:** `1 Unit = 10 USD = 45,000 MMK`

---

## 🧪 Verification & Testing

Run the automated test suite:
```bash
# Offline unit tests & 50-thread atomic concurrency simulation
python backend/test_system.py --unit

# Full end-to-end live stress test (requires Gateway, Shards & MongoDB running)
python backend/test_system.py --live
```

Regenerate gRPC Python stubs after editing `proto/auction.proto`:
```bash
python generate_proto.py
```
