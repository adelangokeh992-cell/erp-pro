"""
Customers Routes - Multi-Tenant Support
"""
from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import List, Optional
from models.customer import CustomerModel, CustomerCreate, CustomerUpdate
from middleware.tenant import get_tenant_from_token
from utils.auth import require_permission
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=List[dict])
async def get_customers(authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("customers"))):
    """Get all customers for tenant"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"tenantId": tenant_id} if tenant_id else {}
    
    customers = await db.customers.find(query).to_list(1000)
    for customer in customers:
        customer['_id'] = str(customer['_id'])
    return customers


@router.get("/{customer_id}", response_model=dict)
async def get_customer(customer_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("customers"))):
    """Get customer by ID"""
    from server import db
    
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(customer_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    customer = await db.customers.find_one(query)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer['_id'] = str(customer['_id'])
    return customer


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_customer(customer: CustomerCreate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("customers"))):
    """Create new customer"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    
    customer_dict = customer.model_dump()
    customer_dict['tenantId'] = tenant_id
    customer_dict['createdAt'] = datetime.now(timezone.utc)
    customer_dict['updatedAt'] = datetime.now(timezone.utc)
    
    result = await db.customers.insert_one(customer_dict)
    created_customer = await db.customers.find_one({"_id": result.inserted_id})
    created_customer['_id'] = str(created_customer['_id'])
    
    return created_customer


@router.put("/{customer_id}", response_model=dict)
async def update_customer(customer_id: str, customer: CustomerUpdate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("customers"))):
    """Update customer"""
    from server import db
    
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(customer_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    existing = await db.customers.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {k: v for k, v in customer.model_dump().items() if v is not None}
    update_data['updatedAt'] = datetime.now(timezone.utc)
    
    await db.customers.update_one(query, {"$set": update_data})
    
    updated_customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    updated_customer['_id'] = str(updated_customer['_id'])
    
    return updated_customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("customers"))):
    """Delete customer"""
    from server import db
    
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(customer_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    result = await db.customers.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return None
