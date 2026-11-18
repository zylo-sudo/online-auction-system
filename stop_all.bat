@echo off
title Stop NovaAuction Services
echo [*] Stopping running Python and Node processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
echo [OK] All services stopped.
pause
