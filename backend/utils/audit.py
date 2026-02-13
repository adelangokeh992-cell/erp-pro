"""
Audit logging - record who did what and when.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional


async def log_audit(
    db,
    user_id: str,
    action: str,
    resource: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """Append an audit entry to the audit_logs collection."""
    await db.audit_logs.insert_one({
        "userId": user_id,
        "action": action,
        "resource": resource,
        "resourceId": resource_id,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc),
    })
