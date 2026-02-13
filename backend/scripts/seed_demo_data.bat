@echo off
REM Fill database with one month of demo data (customers, products, suppliers, purchases, sales).
cd /d "%~dp0.."
python scripts/seed_demo_data.py
pause
