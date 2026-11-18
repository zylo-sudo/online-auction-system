import os
import sys
import time
import hashlib
import random
from pymongo import MongoClient

def hash_pass(p):
    return hashlib.sha256(p.encode("utf-8")).hexdigest()

def seed_database():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client["auction_db"]

    print(f"[*] Seeding MongoDB at {mongo_uri}...")
    
    # Clean old records
    db.users.delete_many({})
    db.auctions.delete_many({})
    db.bids.delete_many({})
    db.events.delete_many({})
    db.analytics_trending.delete_many({})
    db.analytics_recommendations.delete_many({})
    db.analytics_fraud.delete_many({})
    db.messages.delete_many({})

    now = int(time.time() * 1000)
    day_ms = 86400 * 1000

    # 1. Comprehensive Seed Users (Managers and Diverse Elite Collectors)
    default_users = [
        # Platform Managers
        {
            "username": "admin_manager",
            "full_name": "Alexander Vance (Chief Auctioneer)",
            "email": "admin@novaauction.io",
            "password_hash": hash_pass("password123"),
            "role": "MANAGER",
            "balance": 0.0,
            "created_at": now - 30 * day_ms
        },
        {
            "username": "sarah_manager",
            "full_name": "Sarah Connor (Operations Lead)",
            "email": "sarah@novaauction.io",
            "password_hash": hash_pass("password123"),
            "role": "MANAGER",
            "balance": 0.0,
            "created_at": now - 25 * day_ms
        },

        # Elite Customers / Collectors with Win Rates and Collector Tiers (Denominated in Units: 1 Unit = 10 USD = 45,000 MMK)
        {
            "username": "alice_collector",
            "full_name": "Alice Morgan (Royal Jewelry Connoisseur)",
            "email": "alice@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 10000000.0, # 10M Units ($100M USD / 450B MMK)
            "created_at": now - 40 * day_ms,
            "auctions_won": 5,
            "auctions_participated": 7,
            "win_rate": 71.4,
            "total_bids_placed": 42,
            "collector_tier": "LEGEND" # Diamond VIP Legend
        },
        {
            "username": "diana_vip",
            "full_name": "Diana Ross (Fine Art & Rare Gem Investor)",
            "email": "diana@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 9000000.0, # 9M Units ($90M USD)
            "created_at": now - 35 * day_ms,
            "auctions_won": 4,
            "auctions_participated": 6,
            "win_rate": 66.7,
            "total_bids_placed": 38,
            "collector_tier": "LEGEND" # Diamond VIP Legend
        },
        {
            "username": "aisha_gems",
            "full_name": "Aisha Al-Mansoor (High Jewelry Specialist)",
            "email": "aisha@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 8000000.0, # 8M Units ($80M USD)
            "created_at": now - 28 * day_ms,
            "auctions_won": 3,
            "auctions_participated": 5,
            "win_rate": 60.0,
            "total_bids_placed": 29,
            "collector_tier": "LEGEND" # Diamond VIP Legend
        },
        {
            "username": "bob_trader",
            "full_name": "Bob Jenkins (Historic Artifacts Trader)",
            "email": "bob@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 2500000.0, # 2.5M Units ($25M USD)
            "created_at": now - 30 * day_ms,
            "auctions_won": 3,
            "auctions_participated": 7,
            "win_rate": 42.9,
            "total_bids_placed": 35,
            "collector_tier": "MASTER" # Platinum Master Collector
        },
        {
            "username": "charlie_sniper",
            "full_name": "Charlie King (Iconic Instruments Collector)",
            "email": "charlie@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 2000000.0, # 2M Units ($20M USD)
            "created_at": now - 22 * day_ms,
            "auctions_won": 3,
            "auctions_participated": 8,
            "win_rate": 37.5,
            "total_bids_placed": 31,
            "collector_tier": "MASTER" # Platinum Master Collector
        },
        {
            "username": "hannah_vip",
            "full_name": "Hannah Zhao (Haute Couture & Luxury Investor)",
            "email": "hannah@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 1800000.0, # 1.8M Units ($18M USD)
            "created_at": now - 20 * day_ms,
            "auctions_won": 2,
            "auctions_participated": 5,
            "win_rate": 40.0,
            "total_bids_placed": 22,
            "collector_tier": "MASTER" # Platinum Master Collector
        },
        {
            "username": "marcus_horology",
            "full_name": "Marcus Vance (Swiss Haute Horlogerie Dealer)",
            "email": "marcus@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 1500000.0, # 1.5M Units ($15M USD)
            "created_at": now - 18 * day_ms,
            "auctions_won": 2,
            "auctions_participated": 7,
            "win_rate": 28.6,
            "total_bids_placed": 26,
            "collector_tier": "ELITE" # Gold Elite Bidder
        },
        {
            "username": "lucas_memorabilia",
            "full_name": "Lucas Sterling (Vintage Sports Archivist)",
            "email": "lucas@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 1200000.0, # 1.2M Units ($12M USD)
            "created_at": now - 15 * day_ms,
            "auctions_won": 2,
            "auctions_participated": 8,
            "win_rate": 25.0,
            "total_bids_placed": 27,
            "collector_tier": "ELITE" # Gold Elite Bidder
        },
        {
            "username": "elena_curator",
            "full_name": "Elena Rostova (European Antiques Curator)",
            "email": "elena@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 1000000.0, # 1M Units ($10M USD)
            "created_at": now - 14 * day_ms,
            "auctions_won": 1,
            "auctions_participated": 4,
            "win_rate": 25.0,
            "total_bids_placed": 19,
            "collector_tier": "ELITE" # Gold Elite Bidder
        },
        {
            "username": "viktor_art",
            "full_name": "Viktor Moreau (Masterpiece Sculptures Collector)",
            "email": "viktor@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 900000.0, # 900K Units ($9M USD)
            "created_at": now - 12 * day_ms,
            "auctions_won": 1,
            "auctions_participated": 5,
            "win_rate": 20.0,
            "total_bids_placed": 18,
            "collector_tier": "ELITE" # Gold Elite Bidder
        },
        {
            "username": "tariq_heritage",
            "full_name": "Tariq Hassan (Ancient Manuscripts Scholar)",
            "email": "tariq@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 800000.0, # 800K Units ($8M USD)
            "created_at": now - 10 * day_ms,
            "auctions_won": 1,
            "auctions_participated": 5,
            "win_rate": 20.0,
            "total_bids_placed": 16,
            "collector_tier": "ELITE" # Gold Elite Bidder
        },
        {
            "username": "chloe_guitars",
            "full_name": "Chloe Bennett (Vintage Rock Gear Enthusiast)",
            "email": "chloe@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 600000.0, # 600K Units ($6M USD)
            "created_at": now - 8 * day_ms,
            "auctions_won": 0,
            "auctions_participated": 6,
            "win_rate": 0.0,
            "total_bids_placed": 21,
            "collector_tier": "ACTIVE" # Silver Active Bidder
        },
        {
            "username": "kenji_nagata",
            "full_name": "Kenji Nagata (Tokyo Imperial Antiques)",
            "email": "kenji@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 500000.0, # 500K Units ($5M USD)
            "created_at": now - 6 * day_ms,
            "auctions_won": 0,
            "auctions_participated": 5,
            "win_rate": 0.0,
            "total_bids_placed": 15,
            "collector_tier": "ACTIVE" # Silver Active Bidder
        },
        {
            "username": "olivia_sound",
            "full_name": "Olivia Sterling (Acoustic Heritage Collector)",
            "email": "olivia@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 400000.0, # 400K Units ($4M USD)
            "created_at": now - 4 * day_ms,
            "auctions_won": 0,
            "auctions_participated": 4,
            "win_rate": 0.0,
            "total_bids_placed": 12,
            "collector_tier": "ACTIVE" # Silver Active Bidder
        },
        {
            "username": "bhone",
            "full_name": "Bhone Myat (Starter Bidder)",
            "email": "bhone@gmail.com",
            "password_hash": hash_pass("password123"),
            "role": "CUSTOMER",
            "balance": 0.0, # 0 Units starter account
            "created_at": now - 1 * day_ms,
            "auctions_won": 0,
            "auctions_participated": 0,
            "win_rate": 0.0,
            "total_bids_placed": 0,
            "collector_tier": "ACTIVE" # Silver Active Bidder
        }
    ]
    for u in default_users:
        u["status"] = "ACTIVE"
        u["approved"] = True
    db.users.insert_many(default_users)
    print(f"[OK] Seeded {len(default_users)} user accounts (Managers + Elite Collectors).")

    # 2. Master list of 36 Real-Life Auction Items
    raw_items = [
        # Top 30 Items from Docx
        {
            "title": "CTF Pink Star Diamond (59.60-carat Fancy Vivid Pink)",
            "description": "The most valuable gem ever sold at auction, 59.60-carat internally flawless oval fancy vivid pink diamond.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/CTF Pink Star Diamond.webp",
            "usd_price": 71200000.0,
            "status": "ACTIVE",
            "highest_bidder": "alice_collector",
            "total_bids": 18
        },
        {
            "title": "The Williamson Pink Star Diamond (11.15-carat Fancy Vivid Pink)",
            "description": "Cushion-shaped fancy vivid pink diamond of exceptional clarity and historic saturation.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/The Williamson Pink Star.jpg",
            "usd_price": 57700000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "The Oppenheimer Blue Diamond (14.62-carat Fancy Vivid Blue)",
            "description": "The legendary Vivid Blue diamond from De Beers chairman Sir Philip Oppenheimer.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/The Oppenheimer Blue.jpg",
            "usd_price": 57500000.0,
            "status": "ACTIVE",
            "highest_bidder": "aisha_gems",
            "total_bids": 14
        },
        {
            "title": "The De Beers Blue Diamond (15.10-carat Step-Cut Blue)",
            "description": "Remarkable 15.10-carat step-cut fancy vivid blue diamond, the largest step-cut blue in history.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/The De Beers Blue.jpg",
            "usd_price": 57500000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "The Winston Pink Legacy (18.96-carat Fancy Vivid Pink)",
            "description": "Classic emerald-cut pink diamond of incredible saturation from the historic Oppenheimer collection.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/The Winston Pink Legacy.webp",
            "usd_price": 50400000.0,
            "status": "ACTIVE",
            "highest_bidder": "alice_collector",
            "total_bids": 12
        },
        {
            "title": "The Blue Moon of Josephine Diamond (12.03-carat Blue)",
            "description": "Rare cushion-shaped fancy vivid blue diamond with flawless clarity, named for Josephine Lau.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/The Blue Moon of Josephine.jpg",
            "usd_price": 48500000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "The Graff Pink Diamond (24.78-carat Fancy Intense Pink)",
            "description": "Rare emerald-cut pink diamond mounted in platinum, formerly in the private collection of Harry Winston.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/The Graff Pink.jpg",
            "usd_price": 46200000.0,
            "status": "ACTIVE",
            "highest_bidder": "diana_vip",
            "total_bids": 10
        },
        {
            "title": "Marie Antoinette's Natural Pearl and Diamond Pendant",
            "description": "Historic drop pearl measuring 26 x 18 mm with diamond bow from Queen Marie Antoinette of France.",
            "category": "Jewelry",
            "image_url": "/items_photo/Jewelry/Marie Antoinettes Pearl Pendant.jpg",
            "usd_price": 36200000.0,
            "status": "ENDED",
            "highest_bidder": "alice_collector",
            "total_bids": 22
        },
        {
            "title": "The Badminton Cabinet (18th-century Florentine Pietra Dura)",
            "description": "Masterpiece Florentine ebony cabinet crafted in 1726 with hardstones and gilded bronze mounts.",
            "category": "Experiences, Homeware & Luxury Fashion",
            "image_url": "/items_photo/Experiences, Homeware & Luxury Fashion/The Badminton Cabinet.webp",
            "usd_price": 36700000.0,
            "status": "ACTIVE",
            "highest_bidder": "viktor_art",
            "total_bids": 9
        },
        {
            "title": "Blue Origin New Shepard First Human Flight Seat",
            "description": "Inaugural suborbital spaceflight seat alongside Jeff Bezos for private commercial space exploration.",
            "category": "Experiences, Homeware & Luxury Fashion",
            "image_url": "/items_photo/Experiences, Homeware & Luxury Fashion/Blue Origin New Shepard 1st Flight Seat.jpg",
            "usd_price": 28000000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Patek Philippe Grandmaster Chime Ref. 6300A-010",
            "description": "Unique stainless steel edition with 20 complications, reversible case, and salmon opaline dial.",
            "category": "Experiences, Homeware & Luxury Fashion",
            "image_url": "/items_photo/Experiences, Homeware & Luxury Fashion/Patek Philippe Grandmaster Chime 6300A-010.webp",
            "usd_price": 31200000.0,
            "status": "ACTIVE",
            "highest_bidder": "marcus_horology",
            "total_bids": 16
        },
        {
            "title": "Warren Buffett Annual Power Lunch at Smith & Wollensky",
            "description": "Private dining experience for up to 7 guests with Berkshire Hathaway Chairman Warren Buffett.",
            "category": "Experiences, Homeware & Luxury Fashion",
            "image_url": "/items_photo/Experiences, Homeware & Luxury Fashion/Warren Buffett Annual Charity Power Lunch.png",
            "usd_price": 19000000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "David Gilmour's 'Black Strat' Fender Stratocaster",
            "description": "Historic 1969 customized Fender Stratocaster used across 'The Dark Side of the Moon' and 'Wish You Were Here'.",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/David Gilmours Black Strat.jpg",
            "usd_price": 14550000.0,
            "status": "ACTIVE",
            "highest_bidder": "charlie_sniper",
            "total_bids": 11
        },
        {
            "title": "1952 Topps Mickey Mantle #311 Card (SGC 9.5)",
            "description": "The Holy Grail of modern sports collectibles, highest graded mint 1952 Topps rookie card in existence.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/1952 Topps Mickey Mantle #311 (SGC 9.5).jpg",
            "usd_price": 12600000.0,
            "status": "ACTIVE",
            "highest_bidder": "lucas_memorabilia",
            "total_bids": 13
        },
        {
            "title": "Jerry Garcia's Custom-Built 'Tiger' Guitar (Doug Irwin)",
            "description": "Grateful Dead frontman Jerry Garcia's primary instrument hand-crafted from cocobolo and vermillion.",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/Jerry Garcias Tiger Guitar.png",
            "usd_price": 11560000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Michael Jordan 1998 NBA Finals Game 1 Jersey ('The Last Dance')",
            "description": "Game-worn iconic Chicago Bulls #23 red jersey from Game 1 of the 1998 NBA Championship Finals.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/Michael Jordan 1998 Last Dance Game 1 NBA Finals Jersey.jpg",
            "usd_price": 10100000.0,
            "status": "ACTIVE",
            "highest_bidder": "bob_trader",
            "total_bids": 14
        },
        {
            "title": "Diego Maradona 1986 'Hand of God' World Cup Match Shirt",
            "description": "Historic Argentina #10 blue jersey worn during the 1986 World Cup quarter-final victory against England.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/Diego Maradona 1986 Hand of God Argentina Shirt.jpg",
            "usd_price": 9280000.0,
            "status": "ACTIVE",
            "highest_bidder": "lucas_memorabilia",
            "total_bids": 15
        },
        {
            "title": "Original Olympic Games Manifesto Manuscript (Pierre de Coubertin)",
            "description": "14-page handwritten French manuscript written in 1892 that re-established the Modern Olympic Games.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/Pierre de Coubertin 1892 Olympic Manifesto.jpg",
            "usd_price": 8800000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Kurt Cobain's 1969 Fender Mustang Guitar ('Smells Like Teen Spirit')",
            "description": "Lake Placid Blue competition finish left-handed electric guitar featured in the iconic 1991 Nirvana music video.",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/Kurt Cobain 1969 Smells Like Teen Spirit Fender Mustang.jpg",
            "usd_price": 6910000.0,
            "status": "ACTIVE",
            "highest_bidder": "charlie_sniper",
            "total_bids": 14
        },
        {
            "title": "Kurt Cobain's 1959 Martin D-18E ('MTV Unplugged')",
            "description": "Acoustic-electric guitar played during Nirvana's landmark 1993 MTV Unplugged performance in New York.",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/Kurt Cobain 1959 Martin D-18E MTV Unplugged.jpg",
            "usd_price": 6010000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Kobe Bryant 2007-2008 Signed MVP Season Game-Worn Jersey",
            "description": "Signed game-worn Los Angeles Lakers #24 gold jersey from Kobe's sole NBA MVP winning campaign.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/Kobe Bryant 2007-08 Signed MVP Game-Worn Jersey.jpg",
            "usd_price": 5850000.0,
            "status": "ACTIVE",
            "highest_bidder": "diana_vip",
            "total_bids": 12
        },
        {
            "title": "Babe Ruth 1927-1930 New York Yankees Game-Worn Jersey",
            "description": "Flannel home pinstripe jersey from baseball icon Babe Ruth's peak championship years with the Bronx Bombers.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/Babe Ruth 1927-1930 New York Yankees Jersey.jpg",
            "usd_price": 5640000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Shohei Ohtani 50th Home Run Ball (Inaugural 50/50 Season)",
            "description": "Historic Rawlings baseball hit by Shohei Ohtani to establish the first 50-homer / 50-steal season in MLB history.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/Shohei Ohtani 50-50 Home Run Baseball.webp",
            "usd_price": 4390000.0,
            "status": "ACTIVE",
            "highest_bidder": "bob_trader",
            "total_bids": 17
        },
        {
            "title": "Eric Clapton's 1939 Martin 000-42 Acoustic Guitar (Crossroads)",
            "description": "Vintage pre-war Martin acoustic guitar played on Clapton's acclaimed MTV Unplugged acoustic tracks.",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/Eric Clapton 1939 Martin 000-42.jpg",
            "usd_price": 4100000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "John Lennon's Broadwood Upright Piano (Imagine Recordings)",
            "description": "Walnut upright piano from Ascot Sound Studios used by John Lennon to compose songs for the Imagine album.",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/John Lennon Broadwood Upright Piano.jpg",
            "usd_price": 3250000.0,
            "status": "ACTIVE",
            "highest_bidder": "alice_collector",
            "total_bids": 11
        },
        {
            "title": "Ringo Starr's Beatles Drop-T Logo Ed Sullivan Drum Head",
            "description": "Original Ludwig 20-inch bass drum head featuring the Beatles drop-T logo used on The Ed Sullivan Show (1964).",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/Ringo Starr Beatles Ed Sullivan Drum Head.jpg",
            "usd_price": 2880000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Bob Dylan's Handwritten 'The Times They Are A-Changin'' Lyrics",
            "description": "Four-page complete original manuscript with Dylan's pencil and ink annotations and working lyrical variations.",
            "category": "Autographed Music Memorabilia",
            "image_url": "/items_photo/Autographed Music Memorabilia/Bob Dylan Handwritten The Times They Are A-Changin Lyrics.jpg",
            "usd_price": 2520000.0,
            "status": "ACTIVE",
            "highest_bidder": "diana_vip",
            "total_bids": 10
        },
        {
            "title": "Michael Jordan NBA Debut Ticket Stub (Oct 26, 1984 - PSA 8)",
            "description": "Rare Chicago Bulls season ticket stub from Michael Jordan's first career NBA game at Chicago Stadium.",
            "category": "Autographed Sports Memorabilia & Game Tickets",
            "image_url": "/items_photo/Autographed Sports Memorabilia & Game Tickets/Michael Jordan NBA Debut Ticket Stub.jpg",
            "usd_price": 468000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Hermès Diamond Himalaya Niloticus Crocodile Birkin 30",
            "description": "Extremely rare 18k white gold and diamond hardware Himalaya Niloticus crocodile luxury handbag.",
            "category": "Experiences, Homeware & Luxury Fashion",
            "image_url": "/items_photo/Experiences, Homeware & Luxury Fashion/Hermes Diamond Himalaya Birkin 30.jpg",
            "usd_price": 450000.0,
            "status": "ACTIVE",
            "highest_bidder": "hannah_vip",
            "total_bids": 15
        },
        {
            "title": "Led Zeppelin 2007 O2 Reunion VIP / Rehearsal Backstage Access",
            "description": "Framed commemorative pass set signed by Jimmy Page, Robert Plant, and John Paul Jones from London O2.",
            "category": "Experiences, Homeware & Luxury Fashion",
            "image_url": "/items_photo/Experiences, Homeware & Luxury Fashion/Led Zeppelin 2007 O2 Reunion VIP Backstage Passes.webp",
            "usd_price": 170000.0,
            "status": "ENDED",
            "highest_bidder": "bob_trader",
            "total_bids": 18
        },

        # 6 Original Featured Items
        {
            "title": "Rolex Daytona 116500LN (Panda Dial)",
            "description": "Iconic stainless steel chronograph with black Cerachrom bezel and white dial.",
            "category": "Watches & Luxury",
            "image_url": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
            "usd_price": 30000.0,
            "status": "ACTIVE",
            "highest_bidder": "marcus_horology",
            "total_bids": 9
        },
        {
            "title": "Patek Philippe Nautilus 5711/1A-010",
            "description": "Original blue ribbed dial luxury timepiece, mint complete box and papers.",
            "category": "Watches & Luxury",
            "image_url": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80",
            "usd_price": 100000.0,
            "status": "ACTIVE",
            "highest_bidder": "hannah_vip",
            "total_bids": 8
        },
        {
            "title": "Apple Vision Pro (1TB Developer Edition)",
            "description": "Spatial computer with M2 + R1 dual chip architecture, pristine condition with travel case.",
            "category": "Electronics",
            "image_url": "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=800&q=80",
            "usd_price": 3500.0,
            "status": "ACTIVE",
            "highest_bidder": "charlie_sniper",
            "total_bids": 7
        },
        {
            "title": "Custom Liquid-Cooled RTX 4090 Gaming Rig",
            "description": "Intel Core i9-14900KS, 64GB DDR5 7200MHz, Custom Hardline Loop, 4TB NVMe.",
            "category": "Gaming & Tech",
            "image_url": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80",
            "usd_price": 4000.0,
            "status": "UPCOMING",
            "highest_bidder": "",
            "total_bids": 0
        },
        {
            "title": "Cyberpunk Neon Cyber-Katana Replica",
            "description": "Full-scale LED illumination Damascus steel forged collector masterpiece.",
            "category": "Art & Collectibles",
            "image_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
            "usd_price": 500.0,
            "status": "ENDED",
            "highest_bidder": "elena_curator",
            "total_bids": 12
        },
        {
            "title": "1967 Shelby GT500 Eleanor Diecast 1:18",
            "description": "Numbered limited run serialized diecast model in gunmetal grey with certificate.",
            "category": "Automotive",
            "image_url": "https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=800&q=80",
            "usd_price": 300.0,
            "status": "ENDED",
            "highest_bidder": "tariq_heritage",
            "total_bids": 14
        }
    ]

    USD_TO_UNITS = 0.1  # 1 Unit = 10 USD => Units = USD / 10
    sample_auctions = []

    # Customer bidders pool for generating realistic historical bids
    customer_pool = [u["username"] for u in default_users if u["role"] == "CUSTOMER"]

    for idx, item in enumerate(raw_items, start=1):
        target_price_units = round(item["usd_price"] * USD_TO_UNITS, 2)
        start_price_units = round(target_price_units * 0.88, 2)
        current_price_units = round(target_price_units, 2)

        status = item["status"]
        shard_id = (idx % 2) + 1

        if status == "ACTIVE":
            elapsed_ms = random.randint(1, 4) * day_ms + random.randint(1000, 86399000)
            remaining_ms = random.randint(7, 28) * day_ms + random.randint(1000, 86399000)
            start_time = now - elapsed_ms
            end_time = now + remaining_ms
        elif status == "UPCOMING":
            wait_days = random.randint(7, 365)
            wait_ms = wait_days * day_ms + random.randint(1000, 86399000)
            duration_ms = random.randint(7, 21) * day_ms + random.randint(1000, 86399000)
            start_time = now + wait_ms
            end_time = start_time + duration_ms
            current_price_units = start_price_units
        else: # ENDED
            ended_days = random.randint(2, 14)
            start_time = now - (ended_days + 10) * day_ms - random.randint(1000, 86399000)
            end_time = now - (ended_days * day_ms) - random.randint(1000, 86399000)

        auction_doc = {
            "title": item["title"],
            "description": item["description"],
            "category": item["category"],
            "image_url": item["image_url"],
            "start_price": float(start_price_units),
            "current_price": float(current_price_units),
            "highest_bidder": item["highest_bidder"],
            "start_time": start_time,
            "end_time": end_time,
            "status": status,
            "shard_id": shard_id,
            "total_bids": item["total_bids"],
            "created_at": start_time
        }
        sample_auctions.append(auction_doc)

    total_bids_inserted = 0

    for item in sample_auctions:
        res = db.auctions.insert_one(item)
        aid = str(res.inserted_id)

        # Log creation event
        db.events.insert_one({
            "event_type": "AUCTION_CREATED",
            "auction_id": aid,
            "category": item["category"],
            "start_price": item["start_price"],
            "shard_id": item["shard_id"],
            "timestamp": item["start_time"]
        })

        # Generate rich ladder of sequential historical bids for active/ended items
        num_bids = item["total_bids"]
        winner = item["highest_bidder"]

        if num_bids > 0 and winner:
            start_p = item["start_price"]
            curr_p = item["current_price"]
            delta = (curr_p - start_p) / max(1, num_bids)

            # Pick 3 to 6 distinct competitors for this auction item
            competitors = [c for c in customer_pool if c != winner]
            selected_bidders = random.sample(competitors, min(len(competitors), random.randint(3, 5))) + [winner]
            
            # Start timestamp spacing
            auction_duration_active = (now - item["start_time"]) if item["status"] == "ACTIVE" else (item["end_time"] - item["start_time"])
            time_step = auction_duration_active / (num_bids + 1)

            for b_idx in range(1, num_bids + 1):
                # The final bid belongs to the highest_bidder
                if b_idx == num_bids:
                    bidder = winner
                    bid_amount = curr_p
                    bid_time = now - random.randint(15000, 300000) if item["status"] == "ACTIVE" else (item["end_time"] - random.randint(10000, 60000))
                else:
                    # Pick an alternating competitor
                    bidder = random.choice([u for u in selected_bidders if u != winner] or selected_bidders)
                    bid_amount = round(start_p + (delta * b_idx), 2)
                    if bid_amount >= curr_p:
                        bid_amount = round(curr_p * 0.98, 2)
                    bid_time = int(item["start_time"] + (time_step * b_idx))

                bid_doc = {
                    "auction_id": aid,
                    "bidder": bidder,
                    "amount": float(bid_amount),
                    "timestamp": int(bid_time),
                    "shard_id": item["shard_id"]
                }
                db.bids.insert_one(bid_doc)
                total_bids_inserted += 1

                # Log BID_PLACED event for PySpark Analytics
                db.events.insert_one({
                    "event_type": "BID_PLACED",
                    "auction_id": aid,
                    "bidder": bidder,
                    "amount": float(bid_amount),
                    "category": item["category"],
                    "shard_id": item["shard_id"],
                    "timestamp": int(bid_time)
                })

    # 3. Seed Comprehensive Notifications for Managers and All Customers
    notifications_to_seed = []
    hour_ms = 3600 * 1000

    # A. Manager Notifications (Account Requests, Customer Wins, Collector Tier Advancements)
    # 1. Pending & Processed Account Requests
    notifications_to_seed.extend([
        {
            "id": "req_julian_art",
            "type": "ACCOUNT_APPROVAL_REQUEST",
            "recipientRole": "MANAGER",
            "title": "Account Registration Request",
            "message": "Julian Vance (@julian_art) submitted a new Customer Account registration.",
            "details": {
                "requester_username": "julian_art",
                "requester_name": "Julian Vance",
                "requester_email": "julian.vance@artgallery.com",
                "requester_role": "CUSTOMER"
            },
            "timestamp": now - int(0.5 * hour_ms),
            "read": False,
            "actionStatus": "PENDING"
        },
        {
            "id": "req_sophia_gems",
            "type": "ACCOUNT_APPROVAL_REQUEST",
            "recipientRole": "MANAGER",
            "title": "Account Registration Request",
            "message": "Sophia Bennett (@sophia_gems) submitted a new Customer Account registration.",
            "details": {
                "requester_username": "sophia_gems",
                "requester_name": "Sophia Bennett",
                "requester_email": "sophia@luxurygems.io",
                "requester_role": "CUSTOMER"
            },
            "timestamp": now - int(2.5 * hour_ms),
            "read": False,
            "actionStatus": "PENDING"
        },
        {
            "id": "req_maximilian_cars",
            "type": "ACCOUNT_APPROVAL_REQUEST",
            "recipientRole": "MANAGER",
            "title": "Account Registration Request",
            "message": "Maximilian Sterling (@maximilian_cars) requested high-liquidity Customer status.",
            "details": {
                "requester_username": "maximilian_cars",
                "requester_name": "Maximilian Sterling",
                "requester_email": "max@monacocars.com",
                "requester_role": "CUSTOMER"
            },
            "timestamp": now - int(5 * hour_ms),
            "read": False,
            "actionStatus": "PENDING"
        },
        {
            "id": "req_elena_curator",
            "type": "ACCOUNT_APPROVAL_REQUEST",
            "recipientRole": "MANAGER",
            "title": "Account Registration Request",
            "message": "Elena Rostova (@elena_curator) registration was approved by System Administrator.",
            "details": {
                "requester_username": "elena_curator",
                "requester_name": "Elena Rostova",
                "requester_email": "elena@gmail.com",
                "requester_role": "CUSTOMER"
            },
            "timestamp": now - 14 * day_ms,
            "read": True,
            "actionStatus": "APPROVED"
        }
    ])

    # 2. Customer Auction Wins for Manager (Denominated in Units)
    manager_wins = [
        ("alice_collector", "1962 Ferrari 250 GTO", 7000000.0, 22, 1),
        ("diana_vip", "Queen Marie Antoinette Diamond Royal Necklace", 3500000.0, 19, 2),
        ("aisha_gems", "The Graff Pink Diamond Ring", 4600000.0, 16, 3),
        ("charlie_sniper", "Kurt Cobain 1959 Martin D-18E Acoustic Guitar", 601000.0, 18, 4),
        ("bob_trader", "Michael Jordan 1998 NBA Finals Game 1 Jersey", 1010000.0, 17, 5),
        ("hannah_vip", "Hermes Birkin Bag Matte White Himalaya Niloticus Crocodile", 38000.0, 15, 6),
        ("marcus_horology", "Patek Philippe Henry Graves Supercomplication Pocket Watch", 2400000.0, 20, 7),
        ("lucas_memorabilia", "Diego Maradona 1986 'Hand of God' Match-Worn Jersey", 928000.0, 14, 8),
    ]

    for winner_u, item_title, amt, bid_cnt, days_ago in manager_wins:
        notifications_to_seed.append({
            "id": f"mgr_win_{winner_u}_{days_ago}",
            "type": "AUCTION_WON",
            "recipientRole": "MANAGER",
            "title": "Auction Concluded & Won",
            "message": f"@{winner_u} won '{item_title}' with a final winning bid of {amt:,.0f} Units (≈ ${(amt * 10):,.0f} USD • {(amt * 45000):,.0f} MMK, {bid_cnt} bids placed).",
            "details": {
                "auction_title": item_title,
                "winner": winner_u,
                "amount": amt,
                "total_bids": bid_cnt
            },
            "timestamp": now - (days_ago * day_ms),
            "read": days_ago > 3
        })

    # 3. Collector Level Achievements for Manager
    collector_promotions = [
        ("alice_collector", "Alice Morgan", "Diamond VIP Legend", 71.4, 5, 2),
        ("diana_vip", "Diana Ross", "Diamond VIP Legend", 66.7, 4, 3),
        ("aisha_gems", "Aisha Al-Mansoor", "Diamond VIP Legend", 60.0, 3, 4),
        ("bob_trader", "Bob Jenkins", "Platinum Master Collector", 42.9, 3, 5),
        ("charlie_sniper", "Charlie King", "Platinum Master Collector", 37.5, 3, 6),
        ("hannah_vip", "Hannah Zhao", "Platinum Master Collector", 40.0, 2, 7),
        ("marcus_horology", "Marcus Vance", "Gold Elite Bidder", 28.6, 2, 8),
        ("lucas_memorabilia", "Lucas Sterling", "Gold Elite Bidder", 25.0, 2, 9),
        ("elena_curator", "Elena Rostova", "Gold Elite Bidder", 25.0, 1, 10),
    ]

    for u_name, full_n, tier_t, wr, won_cnt, days_ago in collector_promotions:
        notifications_to_seed.append({
            "id": f"mgr_tier_{u_name}_{days_ago}",
            "type": "LEVEL_ACHIEVED",
            "recipientRole": "MANAGER",
            "title": "Collector Tier Milestone",
            "message": f"@{u_name} ({full_n}) achieved {tier_t} status with a verified {wr:.1f}% Win Rate ({won_cnt} auction victories).",
            "details": {
                "winner": u_name,
                "tier": tier_t,
                "win_rate": wr,
                "auctions_won": won_cnt
            },
            "timestamp": now - (days_ago * day_ms + 2 * hour_ms),
            "read": days_ago > 4
        })

    # B. Customer Personal Notifications (Denominated in Units: 1 Unit = 10 USD = 45,000 MMK)
    customer_personal_notifs = [
        # Alice
        ("alice_collector", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won '1962 Ferrari 250 GTO' with your winning bid of 7,000,000 Units (≈ $70,000,000 USD • 315,000,000,000 MMK).", {"amount": 7000000.0, "auction_title": "1962 Ferrari 250 GTO"}, 1, False),
        ("alice_collector", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'The Lesotho Promise Diamond Necklace' with your winning bid of 1,240,000 Units (≈ $12,400,000 USD • 55,800,000,000 MMK).", {"amount": 1240000.0, "auction_title": "The Lesotho Promise Diamond Necklace"}, 4, True),
        ("alice_collector", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won '1933 Saint-Gaudens Double Eagle Gold Coin' with your winning bid of 1,890,000 Units (≈ $18,900,000 USD • 85,050,000,000 MMK).", {"amount": 1890000.0, "auction_title": "1933 Saint-Gaudens Double Eagle Gold Coin"}, 8, True),
        ("alice_collector", "LEVEL_ACHIEVED", "👑 Level Up: Diamond VIP Legend!", "You have attained Diamond VIP Legend status with a verified 71.4% auction win rate (5 wins). Private VIP rooms unlocked.", {"tier": "Diamond VIP Legend", "win_rate": 71.4}, 2, False),
        ("alice_collector", "BID_OUTBID", "⚡ Outbid Notice", "A competing collector placed a higher bid on 'Queen Marie Antoinette Diamond Royal Necklace'.", {"auction_title": "Queen Marie Antoinette Diamond Royal Necklace", "amount": 3500000.0}, 3, True),

        # Diana
        ("diana_vip", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Queen Marie Antoinette Diamond Royal Necklace' with your winning bid of 3,500,000 Units (≈ $35,000,000 USD • 157,500,000,000 MMK).", {"amount": 3500000.0, "auction_title": "Queen Marie Antoinette Diamond Royal Necklace"}, 2, False),
        ("diana_vip", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'The Pink Star Diamond 59.60 Carat' with your winning bid of 7,120,000 Units (≈ $71,200,000 USD • 320,400,000,000 MMK).", {"amount": 7120000.0, "auction_title": "The Pink Star Diamond 59.60 Carat"}, 5, True),
        ("diana_vip", "LEVEL_ACHIEVED", "👑 Level Up: Diamond VIP Legend!", "You have attained Diamond VIP Legend status with a verified 66.7% auction win rate (4 wins).", {"tier": "Diamond VIP Legend", "win_rate": 66.7}, 3, False),
        ("diana_vip", "BID_OUTBID", "⚡ Outbid Notice", "A competing collector placed a higher bid on 'The Graff Pink Diamond Ring'.", {"auction_title": "The Graff Pink Diamond Ring", "amount": 4600000.0}, 1, False),

        # Bob
        ("bob_trader", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Michael Jordan 1998 NBA Finals Game 1 Jersey' with your winning bid of 1,010,000 Units (≈ $10,100,000 USD • 45,450,000,000 MMK).", {"amount": 1010000.0, "auction_title": "Michael Jordan 1998 NBA Finals Game 1 Jersey"}, 3, False),
        ("bob_trader", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Honus Wagner 1909-1911 T206 Baseball Card' with your winning bid of 725,000 Units (≈ $7,250,000 USD • 32,625,000,000 MMK).", {"amount": 725000.0, "auction_title": "Honus Wagner 1909-1911 T206 Baseball Card"}, 7, True),
        ("bob_trader", "LEVEL_ACHIEVED", "🏆 Level Up: Platinum Master Collector!", "You have attained Platinum Master Collector status with a verified 42.9% auction win rate (3 wins).", {"tier": "Platinum Master Collector", "win_rate": 42.9}, 5, False),

        # Charlie
        ("charlie_sniper", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Kurt Cobain 1959 Martin D-18E Acoustic Guitar' with your winning bid of 601,000 Units (≈ $6,010,000 USD • 27,045,000,000 MMK).", {"amount": 601000.0, "auction_title": "Kurt Cobain 1959 Martin D-18E Acoustic Guitar"}, 4, False),
        ("charlie_sniper", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'David Gilmour 1969 Black Stratocaster Guitar' with your winning bid of 397,500 Units (≈ $3,975,000 USD • 17,887,500,000 MMK).", {"amount": 397500.0, "auction_title": "David Gilmour 1969 Black Stratocaster Guitar"}, 9, True),
        ("charlie_sniper", "LEVEL_ACHIEVED", "🏆 Level Up: Platinum Master Collector!", "You have attained Platinum Master Collector status with a verified 37.5% auction win rate (3 wins).", {"tier": "Platinum Master Collector", "win_rate": 37.5}, 6, False),

        # Aisha
        ("aisha_gems", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'The Graff Pink Diamond Ring' with your winning bid of 4,600,000 Units (≈ $46,000,000 USD • 207,000,000,000 MMK).", {"amount": 4600000.0, "auction_title": "The Graff Pink Diamond Ring"}, 3, False),
        ("aisha_gems", "LEVEL_ACHIEVED", "👑 Level Up: Diamond VIP Legend!", "You have attained Diamond VIP Legend status with a verified 60.0% auction win rate (3 wins).", {"tier": "Diamond VIP Legend", "win_rate": 60.0}, 4, False),

        # Marcus
        ("marcus_horology", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Patek Philippe Henry Graves Supercomplication Pocket Watch' for 2,400,000 Units (≈ $24,000,000 USD • 108,000,000,000 MMK).", {"amount": 2400000.0, "auction_title": "Patek Philippe Henry Graves Supercomplication Pocket Watch"}, 7, False),
        ("marcus_horology", "LEVEL_ACHIEVED", "⭐ Level Up: Gold Elite Bidder!", "You have attained Gold Elite status with a verified 28.6% auction win rate.", {"tier": "Gold Elite Bidder", "win_rate": 28.6}, 8, False),

        # Hannah
        ("hannah_vip", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Hermes Birkin Bag Matte White Himalaya Niloticus Crocodile' for 38,000 Units (≈ $380,000 USD • 1,710,000,000 MMK).", {"amount": 38000.0, "auction_title": "Hermes Birkin Bag Matte White Himalaya Niloticus Crocodile"}, 6, False),
        ("hannah_vip", "LEVEL_ACHIEVED", "🏆 Level Up: Platinum Master Collector!", "You have attained Platinum Master status with a verified 40.0% auction win rate.", {"tier": "Platinum Master Collector", "win_rate": 40.0}, 7, False),

        # Lucas
        ("lucas_memorabilia", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Diego Maradona 1986 'Hand of God' Match-Worn Jersey' for 928,000 Units (≈ $9,280,000 USD • 41,760,000,000 MMK).", {"amount": 928000.0, "auction_title": "Diego Maradona 1986 'Hand of God' Match-Worn Jersey"}, 8, False),
        ("lucas_memorabilia", "LEVEL_ACHIEVED", "⭐ Level Up: Gold Elite Bidder!", "You have attained Gold Elite status with a verified 25.0% auction win rate.", {"tier": "Gold Elite Bidder", "win_rate": 25.0}, 9, False),

        # Elena
        ("elena_curator", "AUCTION_WON", "🎉 Winning Bid Victory!", "Congratulations! You won 'Imperial Faberge Winter Egg (1913)' for 960,000 Units (≈ $9,600,000 USD • 43,200,000,000 MMK).", {"amount": 960000.0, "auction_title": "Imperial Faberge Winter Egg (1913)"}, 10, False),
        ("elena_curator", "LEVEL_ACHIEVED", "⭐ Level Up: Gold Elite Bidder!", "You have attained Gold Elite status with a verified 25.0% auction win rate.", {"tier": "Gold Elite Bidder", "win_rate": 25.0}, 10, False),

        # Starter account bhone
        ("bhone", "ACCOUNT_APPROVED", "🌟 Welcome to Nova Luxury Exchange!", "Your Customer account has been approved by the Platform Manager. You can now participate in luxury live bidding.", {"status": "ACTIVE"}, 1, False),
    ]

    for c_user, n_type, n_title, n_msg, n_det, days_ago, is_read in customer_personal_notifs:
        notifications_to_seed.append({
            "id": f"cust_{c_user}_{n_type}_{days_ago}",
            "type": n_type,
            "recipientRole": "CUSTOMER",
            "recipientUsername": c_user,
            "title": n_title,
            "message": n_msg,
            "details": n_det,
            "timestamp": now - (days_ago * day_ms + 1 * hour_ms),
            "read": is_read
        })

    # Clear and insert all notifications
    db.notifications.delete_many({})
    db.notifications.insert_many(notifications_to_seed)
    print(f"[OK] Successfully seeded {len(notifications_to_seed)} comprehensive historical notifications!")

    # 4. Seed Realistic Chat Messages between Platform Managers and Customers
    sample_messages = [
        # Conversation with @alice_collector
        {
            "id": "msg_alice_1",
            "conversation_id": "conv_alice_collector",
            "customer_username": "alice_collector",
            "sender_username": "alice_collector",
            "sender_name": "Alice Morgan",
            "sender_role": "CUSTOMER",
            "recipient_username": "MANAGER_SUPPORT",
            "content": "Hello Alexander, I'm preparing to place a major bid on the CTF Pink Star Diamond. Could you confirm if high-liquidity escrow settlement is supported?",
            "timestamp": now - 3 * day_ms - 4 * hour_ms,
            "read": True
        },
        {
            "id": "msg_alice_2",
            "conversation_id": "conv_alice_collector",
            "customer_username": "alice_collector",
            "sender_username": "admin_manager",
            "sender_name": "Alexander Vance (Chief Auctioneer)",
            "sender_role": "MANAGER",
            "recipient_username": "alice_collector",
            "content": "Greetings Lady Alice! Absolutely. Your Diamond VIP Legend status grants you immediate direct settlement and private concierge escrow. Your 10,000,000 Units balance is fully cleared for the auction.",
            "timestamp": now - 3 * day_ms - 2 * hour_ms,
            "read": True
        },
        {
            "id": "msg_alice_3",
            "conversation_id": "conv_alice_collector",
            "customer_username": "alice_collector",
            "sender_username": "alice_collector",
            "sender_name": "Alice Morgan",
            "sender_role": "CUSTOMER",
            "recipient_username": "MANAGER_SUPPORT",
            "content": "Splendid! Thank you for the confirmation. I'll be participating actively in the live bidding room.",
            "timestamp": now - 3 * day_ms - 1 * hour_ms,
            "read": True
        },

        # Conversation with @diana_vip
        {
            "id": "msg_diana_1",
            "conversation_id": "conv_diana_vip",
            "customer_username": "diana_vip",
            "sender_username": "diana_vip",
            "sender_name": "Diana Ross",
            "sender_role": "CUSTOMER",
            "recipient_username": "MANAGER_SUPPORT",
            "content": "Good morning Support, does the Queen Marie Antoinette Diamond Necklace lot include the original archival certificates and royal provenance papers?",
            "timestamp": now - 2 * day_ms - 5 * hour_ms,
            "read": True
        },
        {
            "id": "msg_diana_2",
            "conversation_id": "conv_diana_vip",
            "customer_username": "diana_vip",
            "sender_username": "sarah_manager",
            "sender_name": "Sarah Connor (Operations Lead)",
            "sender_role": "MANAGER",
            "recipient_username": "diana_vip",
            "content": "Hello Diana! Yes, complete archival provenance certificates from the Geneva sale and royal inventory documentation are held in our Zurich vaults and will be couriered to you upon lot conclusion.",
            "timestamp": now - 2 * day_ms - 3 * hour_ms,
            "read": True
        },

        # Conversation with @bob_trader
        {
            "id": "msg_bob_1",
            "conversation_id": "conv_bob_trader",
            "customer_username": "bob_trader",
            "sender_username": "bob_trader",
            "sender_name": "Bob Jenkins",
            "sender_role": "CUSTOMER",
            "recipient_username": "MANAGER_SUPPORT",
            "content": "Hi Management, I'm looking to increase my bidding wallet before the Michael Jordan 1998 Finals jersey concludes. What are the deposit limits?",
            "timestamp": now - 1 * day_ms - 8 * hour_ms,
            "read": True
        },
        {
            "id": "msg_bob_2",
            "conversation_id": "conv_bob_trader",
            "customer_username": "bob_trader",
            "sender_username": "admin_manager",
            "sender_name": "Alexander Vance (Chief Auctioneer)",
            "sender_role": "MANAGER",
            "recipient_username": "bob_trader",
            "content": "Hello Bob! As a Platinum Master Collector, your deposit threshold is unlimited. Feel free to use the deposit terminal in your profile or request instant ledger clearance anytime.",
            "timestamp": now - 1 * day_ms - 6 * hour_ms,
            "read": True
        },

        # Conversation with @bhone (Starter Account)
        {
            "id": "msg_bhone_1",
            "conversation_id": "conv_bhone",
            "customer_username": "bhone",
            "sender_username": "admin_manager",
            "sender_name": "Alexander Vance (Chief Auctioneer)",
            "sender_role": "MANAGER",
            "recipient_username": "bhone",
            "content": "Welcome to Nova Luxury Auction Exchange, @bhone! Your Customer registration has been reviewed and approved by Platform Management. You can now explore active luxury lots, join live bidding rooms, or contact us here anytime if you need assistance.",
            "timestamp": now - 6 * hour_ms,
            "read": False
        },
        {
            "id": "msg_bhone_2",
            "conversation_id": "conv_bhone",
            "customer_username": "bhone",
            "sender_username": "bhone",
            "sender_name": "Bhone Myat",
            "sender_role": "CUSTOMER",
            "recipient_username": "MANAGER_SUPPORT",
            "content": "Thank you Alexander! Excited to be here and participate in the upcoming live auctions.",
            "timestamp": now - 4 * hour_ms,
            "read": False
        }
    ]

    db.messages.delete_many({})
    db.messages.insert_many(sample_messages)
    print(f"[OK] Successfully seeded {len(sample_messages)} chat communication messages!")

    active_cnt = sum(1 for a in sample_auctions if a["status"] == "ACTIVE")
    upcoming_cnt = sum(1 for a in sample_auctions if a["status"] == "UPCOMING")
    ended_cnt = sum(1 for a in sample_auctions if a["status"] == "ENDED")
    print(f"[OK] Successfully seeded {len(sample_auctions)} auctions into MongoDB!")
    print(f"     -> Active: {active_cnt} | Upcoming: {upcoming_cnt} | Ended: {ended_cnt}")
    print(f"[OK] Successfully populated {total_bids_inserted} realistic historical bids across all auctions!")
    client.close()


def seed_if_empty():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        db = client["auction_db"]
        if db.users.count_documents({}) == 0 and db.auctions.count_documents({}) == 0:
            print("[*] Empty database detected. Running initial seed...")
            seed_database()
        else:
            print("[*] Database already contains data. Skipping auto-seed.")
    finally:
        client.close()


if __name__ == "__main__":
    if "--if-empty" in sys.argv:
        seed_if_empty()
    else:
        seed_database()
