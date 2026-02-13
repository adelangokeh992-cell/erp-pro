@echo off
REM Run auto-suspend for expired licenses. Use with Windows Task Scheduler (e.g. daily).
REM Set BACKEND_URL if API is not on localhost:8001. Optionally set SUSPEND_CRON_SECRET.

set BACKEND_URL=%BACKEND_URL%
if "%BACKEND_URL%"=="" set BACKEND_URL=http://localhost:8001

cd /d "%~dp0.."
python "%~dp0run_suspend_expired.py"
if errorlevel 1 exit /b 1
exit /b 0
