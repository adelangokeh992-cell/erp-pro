"""
Sync Routes - Bidirectional Offline Synchronization

Provides structured APIs for:
- Uploading batched local changes from offline clients
- Downloading changed records since a given timestamp
- Basic, explicit conflict resolution using updatedAt timestamps
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional, Any
from datetime import datetime, timezone
from bson import ObjectId

from utils.auth import require_tenant

router = APIRouter(prefix="/api/sync", tags=["sync"])


# Collections that participate in sync and their Mongo collection names
SYNC_COLLECTIONS: Dict[str, str] = {
    "products": "products",
    "customers": "customers",
    "suppliers": "suppliers",
    "invoices": "invoices",
    "purchases": "purchases",
    "warehouses": "warehouses",
    "users": "users",
    "expenses": "expenses",
    "accounts": "accounts",
    "journal_entries": "journal_entries",
}

# Collections that are scoped per-tenant (most business data)
TENANT_SCOPED_COLLECTIONS = {
    "products",
    "customers",
    "suppliers",
    "invoices",
    "purchases",
    "warehouses",
    "users",
    "expenses",
    "accounts",
    "journal_entries",
}


class SyncChange(BaseModel):
    """Single change from client for one document."""

    id: Optional[str] = Field(None, alias="_id")
    action: Literal["create", "update", "delete"]
    data: Dict[str, Any] = Field(default_factory=dict)
    # Last server-side updatedAt value the client knows about
    baseUpdatedAt: Optional[datetime] = None
    # Client-side local modification timestamp (for debugging / auditing)
    localUpdatedAt: Optional[datetime] = None


class SyncCollectionUpload(BaseModel):
    """Changes for a single logical collection (e.g., products)."""

    name: str
    changes: List[SyncChange] = Field(default_factory=list)


class SyncUploadRequest(BaseModel):
    """Payload for uploading batched changes from an offline client."""

    collections: List[SyncCollectionUpload]


class SyncItemResult(BaseModel):
    id: Optional[str] = None
    action: str
    status: Literal["applied", "skipped_conflict", "not_found", "error"]
    message: Optional[str] = None
    # In conflict cases, server version is returned for the client to apply
    serverDocument: Optional[Dict[str, Any]] = None


class SyncCollectionUploadResult(BaseModel):
    name: str
    results: List[SyncItemResult]


class SyncUploadResponse(BaseModel):
    collections: List[SyncCollectionUploadResult]
    serverTime: datetime


class SyncCollectionDownloadRequest(BaseModel):
    name: str
    since: Optional[datetime] = None


class SyncDownloadRequest(BaseModel):
    collections: List[SyncCollectionDownloadRequest]


class SyncCollectionDownloadResult(BaseModel):
    name: str
    items: List[Dict[str, Any]]
    serverTime: datetime


class SyncDownloadResponse(BaseModel):
    collections: List[SyncCollectionDownloadResult]


def _get_collection(db, logical_name: str):
    """Map logical collection name to Mongo collection object."""
    if logical_name not in SYNC_COLLECTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Collection '{logical_name}' is not allowed for sync",
        )
    mongo_name = SYNC_COLLECTIONS[logical_name]
    return getattr(db, mongo_name)


def _object_id_or_none(id_str: Optional[str]) -> Optional[ObjectId]:
    if not id_str:
        return None
    if ObjectId.is_valid(id_str):
        return ObjectId(id_str)
    return None


@router.post("/upload", response_model=SyncUploadResponse)
async def upload_changes(
    payload: SyncUploadRequest,
    tenant_id: Optional[str] = Depends(require_tenant),
):
    """
    Upload batched local changes from an offline client.

    Conflict resolution policy (per document):
    - If baseUpdatedAt is provided and server.updatedAt > baseUpdatedAt:
        -> Treat as conflict, do NOT apply client's change, return serverDocument.
    - Otherwise:
        -> Apply client's change, set updatedAt = server time.
    """
    from server import db  # Local import to avoid circulars

    server_now = datetime.now(timezone.utc)
    collection_results: List[SyncCollectionUploadResult] = []

    for collection in payload.collections:
        results: List[SyncItemResult] = []
        try:
            coll = _get_collection(db, collection.name)
        except HTTPException as e:
            # Entire collection name invalid
            results.append(
                SyncItemResult(
                    id=None,
                    action="error",
                    status="error",
                    message=str(e.detail),
                )
            )
            collection_results.append(
                SyncCollectionUploadResult(name=collection.name, results=results)
            )
            continue

        for change in collection.changes:
            item_result = SyncItemResult(
                id=change.id,
                action=change.action,
                status="error",
                message=None,
            )

            try:
                # Prepare tenant filter if applicable
                filter_query: Dict[str, Any] = {}
                if change.id:
                    oid = _object_id_or_none(change.id)
                    if oid is None:
                        # For create operations with local IDs, we ignore invalid ObjectId
                        if change.action in ("update", "delete"):
                            item_result.status = "not_found"
                            item_result.message = "Invalid document ID"
                            results.append(item_result)
                            continue
                        # For create with invalid ID, we will drop it below
                    else:
                        filter_query["_id"] = oid

                # Tenant scoping: only operate within current tenant, when applicable
                if tenant_id and collection.name in TENANT_SCOPED_COLLECTIONS:
                    filter_query["tenantId"] = tenant_id

                existing_doc = None
                if change.action in ("update", "delete"):
                    if "_id" not in filter_query:
                        item_result.status = "not_found"
                        item_result.message = "Missing document ID for update/delete"
                        results.append(item_result)
                        continue

                    existing_doc = await coll.find_one(filter_query)
                    if not existing_doc:
                        item_result.status = "not_found"
                        item_result.message = "Document not found on server"
                        results.append(item_result)
                        continue

                # ----- CREATE -----
                if change.action == "create":
                    data = dict(change.data or {})

                    # Remove any client-side only fields
                    data.pop("_synced", None)
                    data.pop("_updatedAt", None)
                    data.pop("_isNew", None)

                    # Ensure tenant ID is set for tenant-scoped collections
                    if tenant_id and collection.name in TENANT_SCOPED_COLLECTIONS:
                        data["tenantId"] = data.get("tenantId") or tenant_id

                    # Drop client-generated local IDs
                    if not change.id or str(change.id).startswith("local_"):
                        data.pop("_id", None)
                    else:
                        oid = _object_id_or_none(change.id)
                        if oid:
                            data["_id"] = oid

                    data["updatedAt"] = server_now
                    if "createdAt" not in data:
                        data["createdAt"] = server_now

                    insert_result = await coll.insert_one(data)
                    item_result.id = str(insert_result.inserted_id)
                    item_result.status = "applied"

                # ----- UPDATE -----
                elif change.action == "update":
                    data = dict(change.data or {})

                    # Conflict detection using baseUpdatedAt vs server updatedAt
                    base_ts = change.baseUpdatedAt
                    server_updated_at = existing_doc.get("updatedAt")
                    if (
                        base_ts is not None
                        and server_updated_at is not None
                        and server_updated_at > base_ts
                    ):
                        # Conflict: server has a newer version than the base the client edited
                        existing_doc["_id"] = str(existing_doc["_id"])
                        item_result.status = "skipped_conflict"
                        item_result.message = "Server document is newer than client base version"
                        item_result.serverDocument = existing_doc
                    else:
                        # Apply client's changes
                        data.pop("_id", None)
                        data.pop("_synced", None)
                        data.pop("_updatedAt", None)
                        data.pop("_isNew", None)

                        if tenant_id and collection.name in TENANT_SCOPED_COLLECTIONS:
                            data["tenantId"] = tenant_id

                        data["updatedAt"] = server_now

                        await coll.update_one(
                            {"_id": existing_doc["_id"]},
                            {"$set": data},
                        )
                        item_result.status = "applied"

                # ----- DELETE -----
                elif change.action == "delete":
                    await coll.delete_one({"_id": existing_doc["_id"]})
                    item_result.status = "applied"

            except Exception as e:  # noqa: BLE001
                item_result.status = "error"
                item_result.message = str(e)

            results.append(item_result)

        collection_results.append(
            SyncCollectionUploadResult(name=collection.name, results=results)
        )

    return SyncUploadResponse(collections=collection_results, serverTime=server_now)


@router.post("/download", response_model=SyncDownloadResponse)
async def download_changes(
    payload: SyncDownloadRequest,
    tenant_id: Optional[str] = Depends(require_tenant),
):
    """
    Download all documents changed since a given timestamp, per collection.

    - Filters by tenantId automatically for tenant-scoped collections.
    - Uses the standard `updatedAt` field for incremental sync.
    - Does NOT yet track deletions as separate tombstones; common pattern is:
      - Client pushes local deletes via /upload
      - Then calls a full refresh or per-collection incremental load
    """
    from server import db

    server_now = datetime.now(timezone.utc)
    results: List[SyncCollectionDownloadResult] = []

    for collection in payload.collections:
        try:
            coll = _get_collection(db, collection.name)
        except HTTPException:
            # Skip invalid collections, but keep response consistent
            results.append(
                SyncCollectionDownloadResult(
                    name=collection.name, items=[], serverTime=server_now
                )
            )
            continue

        query: Dict[str, Any] = {}
        if tenant_id and collection.name in TENANT_SCOPED_COLLECTIONS:
            query["tenantId"] = tenant_id

        if collection.since is not None:
            query["updatedAt"] = {"$gt": collection.since}

        cursor = coll.find(query)
        docs: List[Dict[str, Any]] = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            docs.append(doc)

        results.append(
            SyncCollectionDownloadResult(
                name=collection.name,
                items=docs,
                serverTime=server_now,
            )
        )

    return SyncDownloadResponse(collections=results)

