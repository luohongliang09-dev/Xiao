@echo off
chcp 65001 >nul
title RAG Launcher
echo ============================================
echo    RAG 知识库问答系统 - 一键启动
echo ============================================
echo.
echo [1/3] 启动后端 (端口 8000)...
start "RAG-Backend" /D "D:\666\RAG\backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000"
echo [2/3] 启动前端 (端口 5173)...
start "RAG-Frontend" /D "D:\666\RAG\frontend" cmd /k "npm run dev"
echo [3/3] 6 秒后自动打开浏览器...
timeout /t 6 /nobreak >nul
start http://localhost:5173
echo.
echo 完成！浏览器已打开（若未自动打开，请访问 http://localhost:5173）
echo 停止服务请双击 stop.bat
echo.
pause
