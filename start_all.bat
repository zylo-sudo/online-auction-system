@echo off
title NovaAuction Launcher
echo ========================================================
echo   Starting NovaAuction Distributed System (Local Mode)
echo ========================================================
echo.

set ROOT_DIR=%~dp0
set PYTHONPATH=%ROOT_DIR%

:: 1. Seed Database
echo [*] Seeding MongoDB with initial auctions and users...
python database\seed.py
echo.

:: 2. Launch Shard 1
echo [*] Launching Auction Shard 1 (gRPC Port 50051)...
start "Auction Shard 1 (Port 50051)" cmd /k "cd /d "%ROOT_DIR%backend\shard" && set PYTHONPATH=%ROOT_DIR%&& set SHARD_ID=1&& set PORT=50051&& set MONGO_URI=mongodb://localhost:27017&& python server.py"

:: 3. Launch Shard 2
echo [*] Launching Auction Shard 2 (gRPC Port 50052)...
start "Auction Shard 2 (Port 50052)" cmd /k "cd /d "%ROOT_DIR%backend\shard" && set PYTHONPATH=%ROOT_DIR%&& set SHARD_ID=2&& set PORT=50052&& set MONGO_URI=mongodb://localhost:27017&& python server.py"

:: Wait 1.5 seconds for shards to initialize
timeout /t 2 /nobreak >nul

:: 4. Launch FastAPI Gateway
echo [*] Launching FastAPI Gateway (Port 8000)...
start "FastAPI Gateway (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend\gateway" && set PYTHONPATH=%ROOT_DIR%&& set SHARD_HOSTS=localhost:50051,localhost:50052&& set MONGO_URI=mongodb://localhost:27017&& set PORT=8000&& python main.py"

:: 5. Launch PySpark Analytics Engine
echo [*] Launching PySpark Analytics Daemon...
start "PySpark Analytics Engine" cmd /k "cd /d "%ROOT_DIR%analytics" && set PYTHONPATH=%ROOT_DIR%&& set MONGO_URI=mongodb://localhost:27017&& python run_all.py"

:: 6. Launch React Frontend
echo [*] Launching React Vite Frontend (Port 3000)...
start "React Frontend (Port 3000)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo.
echo ========================================================
echo   [OK] All Services Started Successfully!
echo   - React UI:             http://localhost:3000
echo   - FastAPI API Docs:     http://localhost:8000/docs
echo   - MongoDB:              mongodb://localhost:27017
echo ========================================================
echo.
pause
