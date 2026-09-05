@echo off
title RAG Launcher
echo ============================================
echo   RAG Knowledge Base - One-click Start
echo ============================================
echo.
echo [1/3] Starting backend (port 8000)...
start "RAG-Backend" /D "D:\666\RAG\backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000"
echo [2/3] Starting frontend (port 5173)...
start "RAG-Frontend" /D "D:\666\RAG\frontend" cmd /k "npm run dev"
echo [3/3] Opening browser in 6 seconds...
timeout /t 6 /nobreak >nul
start http://localhost:5173
echo.
echo Done. If the browser did not open, visit http://localhost:5173
echo To stop, double-click stop.bat
echo.
pause
