"""
Backup and Restore - Export/import tenant data from MongoDB.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from utils.auth import get_current_user

router = APIRouter(prefix="/api/backup", tags=["backup"])

# Collections that are scoped by tenantId
TENANT_COLLECTIONS = [
    "products",
    "customers",
    "suppliers",
    "invoices",
    "purchases",
    "users",
    "warehouses",
    "product_units",
    "expenses",
    "accounts",
    "journal_entries",
    "esl_devices",
    "settings",
]


def _serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict (ObjectId -> str, datetime -> ISO)."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat() if hasattr(v, "isoformat") else str(v)
        elif isinstance(v, dict):
            out[k] = _serialize_doc(v)
        elif isinstance(v, list):
            out[k] = [_serialize_doc(item) if isinstance(item, dict) else item for item in v]
        else:
            out[k] = v
    return out


def _resolve_export_tenant_id(tenant_id_query: Optional[str], current_user: dict) -> str:
    """Determine which tenant_id to export. Raises if not allowed."""
    role = current_user.get("role")
    token_tenant_id = current_user.get("tenantId")
    if role == "super_admin":
        if tenant_id_query:
            return tenant_id_query
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="مدير النظام: يرجى تحديد شركة لتصديرها (tenant_id)",
        )
    if not token_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required",
        )
    if tenant_id_query and tenant_id_query != token_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="لا يمكن تصدير بيانات شركة أخرى",
        )
    return token_tenant_id


@router.get("/export")
async def export_backup(
    tenant_id: Optional[str] = Query(None, alias="tenant_id"),
    current_user: dict = Depends(get_current_user),
):
    """Export all tenant data as JSON backup. Tenant users export their own; super_admin must pass ?tenant_id=."""
    from server import db

    export_tenant_id = _resolve_export_tenant_id(tenant_id, current_user)

    collections_data = {}
    for coll_name in TENANT_COLLECTIONS:
        coll = getattr(db, coll_name, None)
        if coll is None:
            continue
        cursor = coll.find({"tenantId": export_tenant_id})
        docs = await cursor.to_list(length=100000)
        collections_data[coll_name] = [_serialize_doc(d) for d in docs]

    payload = {
        "version": 1,
        "tenantId": export_tenant_id,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "collections": collections_data,
    }
    return payload


def _deserialize_doc(doc: dict) -> dict:
    """Convert backup doc back to MongoDB-friendly (str _id -> ObjectId where needed for insert)."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id" and isinstance(v, str):
            try:
                out[k] = ObjectId(v)
            except Exception:
                out[k] = v
        elif isinstance(v, dict):
            out[k] = _deserialize_doc(v)
        elif isinstance(v, list):
            out[k] = [_deserialize_doc(item) if isinstance(item, dict) else item for item in v]
        else:
            out[k] = v
    return out


@router.post("/restore")
async def restore_backup(
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    """Restore from backup JSON. tenantId in body must match current user's tenant (or super_admin can restore to tenant in body)."""
    from server import db

    backup_tenant_id = body.get("tenantId")
    if not backup_tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ملف النسخة الاحتياطية لا يحتوي على معرف الشركة")

    role = current_user.get("role")
    token_tenant_id = current_user.get("tenantId")
    if role != "super_admin":
        if token_tenant_id != backup_tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="لا يمكن استعادة بيانات شركة أخرى",
            )
    # super_admin: allow restore to any tenant present in backup

    collections = body.get("collections") or {}
    errors = []
    for coll_name in TENANT_COLLECTIONS:
        if coll_name not in collections:
            continue
        coll = getattr(db, coll_name, None)
        if coll is None:
            continue
        docs = collections[coll_name]
        if not isinstance(docs, list):
            errors.append(f"{coll_name}: invalid format")
            continue
        try:
            await coll.delete_many({"tenantId": backup_tenant_id})
            if not docs:
                continue
            to_insert = []
            for d in docs:
                if not isinstance(d, dict):
                    continue
                doc_restore = _deserialize_doc(d)
                doc_restore["tenantId"] = backup_tenant_id
                to_insert.append(doc_restore)
            if to_insert:
                await coll.insert_many(to_insert)
        except Exception as e:
            errors.append(f"{coll_name}: {str(e)}")

    if errors:
        return JSONResponse(
            status_code=status.HTTP_207_MULTI_STATUS,
            content={"message": "استعادة جزئية، بعض المجموعات فشلت", "errors": errors},
        )
    return {"message": "تمت الاستعادة بنجاح"}


@router.post("/scheduled")
async def scheduled_backup(secret: str = Query(..., alias="secret")):
    """
    Trigger backup for all tenants. For cron/Task Scheduler.
    Set BACKUP_CRON_SECRET in .env and call: POST /api/backup/scheduled?secret=YOUR_SECRET
    """
    import os
    from server import db

    expected = os.environ.get("BACKUP_CRON_SECRET", "").strip()
    if not expected or secret != expected:
        raise HTTPException(status_code=403, detail="Invalid secret")

    tenants = await db.tenants.find({}).to_list(1000)
    results = []
    for t in tenants:
        tid = str(t["_id"])
        try:
            collections_data = {}
            for coll_name in TENANT_COLLECTIONS:
                coll = getattr(db, coll_name, None)
                if coll is None:
                    continue
                cursor = coll.find({"tenantId": tid})
                docs = await cursor.to_list(length=100000)
                collections_data[coll_name] = [_serialize_doc(d) for d in docs]
            payload = {
                "version": 1,
                "tenantId": tid,
                "exportedAt": datetime.now(timezone.utc).isoformat(),
                "collections": collections_data,
            }
            # Save to backup dir if configured
            backup_dir = os.environ.get("BACKUP_DIR", "").strip()
            if backup_dir:
                import json
                from pathlib import Path
                Path(backup_dir).mkdir(parents=True, exist_ok=True)
                fname = f"{tid}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
                with open(Path(backup_dir) / fname, "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
            results.append({"tenantId": tid, "status": "ok"})
        except Exception as e:
            results.append({"tenantId": tid, "status": "error", "error": str(e)})

    return {"message": "Scheduled backup completed", "results": results}
