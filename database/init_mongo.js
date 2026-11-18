// MongoDB Initialization Script
// Automatically executed when MongoDB container starts up

db = db.getSiblingDB('auction_db');

// 1. Create Collections
db.createCollection('users');
db.createCollection('auctions');
db.createCollection('bids');
db.createCollection('events');
db.createCollection('notifications');
db.createCollection('messages');
db.createCollection('analytics_trending');
db.createCollection('analytics_recommendations');
db.createCollection('analytics_fraud');

// 2. Create Indexes for High Performance & Distributed Queries
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

db.auctions.createIndex({ "shard_id": 1 });
db.auctions.createIndex({ "status": 1 });
db.auctions.createIndex({ "category": 1 });
db.auctions.createIndex({ "created_at": -1 });

db.bids.createIndex({ "auction_id": 1, "timestamp": -1 });
db.bids.createIndex({ "bidder": 1 });

db.events.createIndex({ "event_type": 1, "timestamp": -1 });
db.events.createIndex({ "auction_id": 1 });

db.notifications.createIndex({ "recipientRole": 1, "timestamp": -1 });
db.notifications.createIndex({ "recipientUsername": 1, "timestamp": -1 });

db.messages.createIndex({ "conversation_id": 1, "timestamp": 1 });

db.analytics_trending.createIndex({ "trending_score": -1 });
db.analytics_recommendations.createIndex({ "bidder": 1 }, { unique: true });

print("[OK] MongoDB auction_db collections and indexes initialized successfully!");
