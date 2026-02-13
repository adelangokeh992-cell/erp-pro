@echo off
cd /d "%~dp0"
where yarn >nul 2>&1 && (yarn start) || (npm run start)
pause
