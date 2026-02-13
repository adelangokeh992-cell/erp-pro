@echo off
title ERP Backend (port 8002)
cd /d "%~dp0"
call venv\Scripts\activate.bat
echo.
echo Starting Backend on http://127.0.0.1:8002
echo Press Ctrl+C to stop.
echo.
python -m uvicorn server:app --host 0.0.0.0 --port 8002
pause
