"""
Audit Log API - list audit entries (for admins).
"""
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from utils.auth import get_current_user, require_permission

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/logs", response_model=List[dict])
async def list_audit_logs(
    current_user: dict = Depends(get_current_user),
    _: dict = Depends(require_permission("settings")),
    limit: int = Query(100, le=500),
    resource: Optional[str] = None,
):
    """List recent audit log entries (requires settings permission)."""
    from server import db
    query = {}
    if resource:
        query["resource"] = resource
    cursor = db.audit_logs.find(query).sort("timestamp", -1).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("timestamp"):
            doc["timestamp"] = doc["timestamp"].isoformat()
        items.append(doc)
    return items
