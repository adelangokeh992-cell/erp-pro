@echo off
echo ==============================
echo   Starting ERP System (Web + Desktop)
echo ==============================
echo.

cd /d "%~dp0"

if not exist "backend\server.py" (
  echo [ERROR] backend\server.py not found. Run this .bat from the ERP project root.
  pause
  exit /b 1
)
if not exist "frontend\package.json" (
  echo [ERROR] frontend\package.json not found. Run this .bat from the ERP project root.
  pause
  exit /b 1
)
set "PYEXE="
where py >nul 2>&1 && set "PYEXE=py -3"
if not defined PYEXE where python >nul 2>&1 && set "PYEXE=python"
if not defined PYEXE where python3 >nul 2>&1 && set "PYEXE=python3"
if not defined PYEXE (
  echo [ERROR] Python not found. Install Python 3.10+ and add it to PATH.
  echo         https://www.python.org/
  pause
  exit /b 1
)

REM Backend: recreate venv if it was moved from another drive/path
if exist "backend\venv\Scripts\python.exe" (
  "backend\venv\Scripts\python.exe" -c "exit(0)" 2>nul
  if errorlevel 1 (
    echo [Backend] Recreating venv...
    rmdir /s /q backend\venv 2>nul
  )
)
if not exist "backend\venv\Scripts\python.exe" (
  echo [Backend] Creating Python virtual environment...
  %PYEXE% -m venv backend\venv
  if errorlevel 1 (
    echo [Backend] Failed to create venv. Try: %PYEXE% -m venv backend\venv
    pause
    exit /b 1
  )
  echo [Backend] Installing Python dependencies...
  call backend\venv\Scripts\pip.exe install -r backend\requirements.txt
  if errorlevel 1 (
    echo [Backend] pip install failed.
    pause
    exit /b 1
  )
)

echo [Backend] Starting API server on port 8001...
start "ERP Backend" cmd /k "backend\run_backend.bat"

timeout /t 3 /nobreak >nul

cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo [Frontend] Installing Node dependencies...
  where yarn >nul 2>&1 && (yarn install --ignore-engines) || (npm install --legacy-peer-deps)
  if errorlevel 1 (
    echo [Frontend] Install failed. Try: cd frontend ^&^& npm install --legacy-peer-deps
    pause
    exit /b 1
  )
)

cd /d "%~dp0"
echo [Frontend] Starting React app on port 3000...
start "ERP Frontend" cmd /k "frontend\run_frontend.bat"

timeout /t 8 /nobreak >nul

if exist "frontend\electron-main.js" (
  echo [Desktop] Starting ERP Desktop (Electron)...
  start "ERP Desktop" cmd /k "frontend\run_electron.bat"
) else (
  echo [Desktop] Skipping Electron (electron-main.js not found).
)

echo.
echo --------------------------------------
echo  Backend : http://localhost:8001
echo  Frontend: http://localhost:3000
echo  Desktop : will open in a separate window (if Electron installed)
echo --------------------------------------
echo.
pause
