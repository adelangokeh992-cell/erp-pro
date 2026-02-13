"""
Suppliers Routes - Multi-Tenant Support
"""
from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import List, Optional
from models.supplier import SupplierModel, SupplierCreate, SupplierUpdate
from middleware.tenant import get_tenant_from_token
from utils.auth import require_permission
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("", response_model=List[dict])
async def get_suppliers(authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("suppliers"))):
    """Get all suppliers for tenant"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"tenantId": tenant_id} if tenant_id else {}
    
    suppliers = await db.suppliers.find(query).to_list(1000)
    for supplier in suppliers:
        supplier['_id'] = str(supplier['_id'])
    return suppliers


@router.get("/{supplier_id}", response_model=dict)
async def get_supplier(supplier_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("suppliers"))):
    """Get supplier by ID"""
    from server import db
    
    if not ObjectId.is_valid(supplier_id):
        raise HTTPException(status_code=400, detail="Invalid supplier ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(supplier_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    supplier = await db.suppliers.find_one(query)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    supplier['_id'] = str(supplier['_id'])
    return supplier


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_supplier(supplier: SupplierCreate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("suppliers"))):
    """Create new supplier"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    
    supplier_dict = supplier.model_dump()
    supplier_dict['tenantId'] = tenant_id
    supplier_dict['createdAt'] = datetime.now(timezone.utc)
    supplier_dict['updatedAt'] = datetime.now(timezone.utc)
    
    result = await db.suppliers.insert_one(supplier_dict)
    created_supplier = await db.suppliers.find_one({"_id": result.inserted_id})
    created_supplier['_id'] = str(created_supplier['_id'])
    
    return created_supplier


@router.put("/{supplier_id}", response_model=dict)
async def update_supplier(supplier_id: str, supplier: SupplierUpdate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("suppliers"))):
    """Update supplier"""
    from server import db
    
    if not ObjectId.is_valid(supplier_id):
        raise HTTPException(status_code=400, detail="Invalid supplier ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(supplier_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    existing = await db.suppliers.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = {k: v for k, v in supplier.model_dump().items() if v is not None}
    update_data['updatedAt'] = datetime.now(timezone.utc)
    
    await db.suppliers.update_one(query, {"$set": update_data})
    
    updated_supplier = await db.suppliers.find_one({"_id": ObjectId(supplier_id)})
    updated_supplier['_id'] = str(updated_supplier['_id'])
    
    return updated_supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(supplier_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("suppliers"))):
    """Delete supplier"""
    from server import db
    
    if not ObjectId.is_valid(supplier_id):
        raise HTTPException(status_code=400, detail="Invalid supplier ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(supplier_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    result = await db.suppliers.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return None
