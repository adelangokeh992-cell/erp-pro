@echo off
cd /d "%~dp0"
set ELECTRON_START_URL=http://localhost:3000
where yarn >nul 2>&1 && (yarn electron-dev) || (npm run electron-dev)
pause
