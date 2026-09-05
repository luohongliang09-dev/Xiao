@echo off
chcp 65001 >nul
title RAG Stop
echo 正在停止 RAG 服务 (端口 8000 / 5173)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"
echo.
echo 已停止后端(8000)和前端(5173)。
pause
