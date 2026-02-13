@echo off
cd /d "%~dp0"
if not exist "%~dp0venv\Scripts\python.exe" (
  echo [ERROR] No venv. Run start.bat from project root first.
  pause
  exit /b 1
)
"%~dp0venv\Scripts\python.exe" -c "exit(0)" 2>nul
if errorlevel 1 (
  echo [ERROR] Venv from different path. Delete backend\venv and run start.bat again.
  pause
  exit /b 1
)
"%~dp0venv\Scripts\python.exe" -m pip install uvicorn fastapi -q
"%~dp0venv\Scripts\python.exe" -m pip install -r "%~dp0requirements.txt" -q 2>nul
"%~dp0venv\Scripts\python.exe" -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
pause
