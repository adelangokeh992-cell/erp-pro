"""
Call the auto-suspend endpoint. Run via cron or Windows Task Scheduler.
Set in env: BACKEND_URL (e.g. http://localhost:8001), optionally SUSPEND_CRON_SECRET.
"""
import os
import sys

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

BASE = os.environ.get("BACKEND_URL", "http://localhost:8001")
SECRET = os.environ.get("SUSPEND_CRON_SECRET")
url = f"{BASE.rstrip('/')}/api/licenses/suspend-expired"
headers = {}
if SECRET:
    headers["X-Cron-Secret"] = SECRET

try:
    r = requests.post(url, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()
    print(f"OK: {data.get('message', '')} suspendedCount={data.get('suspendedCount', 0)}")
except requests.RequestException as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
