@echo off
title RAG Stop
echo Stopping RAG services (ports 8000 / 5173)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"
echo.
echo Stopped backend (8000) and frontend (5173).
pause
