from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import List, Optional
from models.warehouse import WarehouseModel, WarehouseCreate, WarehouseUpdate
from utils.auth import require_permission
from middleware.tenant import get_tenant_from_token
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])


def _base_query(tenant_id: Optional[str]) -> dict:
    return {"tenantId": tenant_id} if tenant_id else {}


@router.get("", response_model=List[dict])
async def get_warehouses(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("warehouses"))
):
    """Get all warehouses"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    warehouses = await db.warehouses.find(base).to_list(1000)
    for warehouse in warehouses:
        warehouse['_id'] = str(warehouse['_id'])
    return warehouses


@router.get("/{warehouse_id}", response_model=dict)
async def get_warehouse(
    warehouse_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("warehouses"))
):
    """Get warehouse by ID"""
    from server import db
    if not ObjectId.is_valid(warehouse_id):
        raise HTTPException(status_code=400, detail="Invalid warehouse ID")

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    warehouse = await db.warehouses.find_one({"_id": ObjectId(warehouse_id), **base})
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    warehouse['_id'] = str(warehouse['_id'])
    return warehouse


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    warehouse: WarehouseCreate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("warehouses"))
):
    """Create new warehouse"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    existing = await db.warehouses.find_one({"code": warehouse.code, **base})
    if existing:
        raise HTTPException(status_code=400, detail="Warehouse code already exists")

    warehouse_dict = warehouse.model_dump()
    warehouse_dict['tenantId'] = tenant_id
    warehouse_dict['createdAt'] = datetime.now(timezone.utc)
    warehouse_dict['updatedAt'] = datetime.now(timezone.utc)

    result = await db.warehouses.insert_one(warehouse_dict)
    created_warehouse = await db.warehouses.find_one({"_id": result.inserted_id})
    created_warehouse['_id'] = str(created_warehouse['_id'])

    return created_warehouse


@router.put("/{warehouse_id}", response_model=dict)
async def update_warehouse(
    warehouse_id: str,
    warehouse: WarehouseUpdate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("warehouses"))
):
    """Update warehouse"""
    from server import db
    if not ObjectId.is_valid(warehouse_id):
        raise HTTPException(status_code=400, detail="Invalid warehouse ID")

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    query = {"_id": ObjectId(warehouse_id), **base}

    update_data = {k: v for k, v in warehouse.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    update_data['updatedAt'] = datetime.now(timezone.utc)

    result = await db.warehouses.update_one(query, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    updated_warehouse = await db.warehouses.find_one({"_id": ObjectId(warehouse_id)})
    updated_warehouse['_id'] = str(updated_warehouse['_id'])

    return updated_warehouse


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warehouse(
    warehouse_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("warehouses"))
):
    """Delete warehouse"""
    from server import db
    if not ObjectId.is_valid(warehouse_id):
        raise HTTPException(status_code=400, detail="Invalid warehouse ID")

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    result = await db.warehouses.delete_one({"_id": ObjectId(warehouse_id), **base})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    return None
