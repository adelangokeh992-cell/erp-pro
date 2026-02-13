@echo off
title Free port 8001
echo.
echo Searching for process using port 8001...
echo.
set "found="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8001"') do (
  echo Stopping process PID: %%a
  taskkill /PID %%a /F 2>nul
  set "found=1"
)
if not defined found (
  echo No process is using port 8001.
) else (
  echo.
  echo Port 8001 is free.
)
echo.
echo You can start the backend now with:
echo   venv\Scripts\activate
echo   python -m uvicorn server:app --host 0.0.0.0 --port 8001
echo.
pause
