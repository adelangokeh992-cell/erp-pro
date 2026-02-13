"""
Tenant Management Routes - Super Admin Only
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId

from models.tenant import TenantCreate, TenantUpdate, TenantStatus, SubscriptionPlan
from models.user import UserRole, DEFAULT_PERMISSIONS
from utils.auth import require_super_admin, get_password_hash
from utils.database import serialize_doc, serialize_docs, generate_tenant_code

router = APIRouter(prefix="/tenants", tags=["Tenant Management"])


@router.get("", response_model=List[dict])
async def get_all_tenants(
    status: Optional[TenantStatus] = None,
    plan: Optional[SubscriptionPlan] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_super_admin)
):
    """Get all tenants with optional filtering"""
    from server import db
    
    query = {}
    
    if status:
        query["status"] = status
    
    if plan:
        query["subscription.plan"] = plan
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"nameEn": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
        ]
    
    tenants = await db.tenants.find(query).skip(skip).limit(limit).to_list(limit)
    
    # Get user count for each tenant
    result = []
    for tenant in tenants:
        tenant_id = str(tenant["_id"])
        user_count = await db.users.count_documents({"tenantId": tenant_id})
        product_count = await db.products.count_documents({"tenantId": tenant_id})
        
        tenant_data = serialize_doc(tenant)
        tenant_data["userCount"] = user_count
        tenant_data["productCount"] = product_count
        result.append(tenant_data)
    
    return result


@router.get("/stats", response_model=dict)
async def get_tenant_stats(current_user: dict = Depends(require_super_admin)):
    """Get overall tenant statistics"""
    from server import db
    
    total = await db.tenants.count_documents({})
    active = await db.tenants.count_documents({"status": "active"})
    trial = await db.tenants.count_documents({"status": "trial"})
    expired = await db.tenants.count_documents({"status": "expired"})
    suspended = await db.tenants.count_documents({"status": "suspended"})
    
    # Plan distribution
    free = await db.tenants.count_documents({"subscription.plan": "free"})
    basic = await db.tenants.count_documents({"subscription.plan": "basic"})
    professional = await db.tenants.count_documents({"subscription.plan": "professional"})
    enterprise = await db.tenants.count_documents({"subscription.plan": "enterprise"})
    
    # Get expiring soon (within 7 days)
    expiring_date = datetime.now(timezone.utc) + timedelta(days=7)
    expiring_soon = await db.tenants.count_documents({
        "subscription.expiryDate": {"$lte": expiring_date, "$gte": datetime.now(timezone.utc)},
        "status": {"$in": ["active", "trial"]}
    })
    
    return {
        "total": total,
        "byStatus": {
            "active": active,
            "trial": trial,
            "expired": expired,
            "suspended": suspended
        },
        "byPlan": {
            "free": free,
            "basic": basic,
            "professional": professional,
            "enterprise": enterprise
        },
        "expiringSoon": expiring_soon
    }


@router.get("/{tenant_id}", response_model=dict)
async def get_tenant(tenant_id: str, current_user: dict = Depends(require_super_admin)):
    """Get single tenant by ID"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get additional stats
    user_count = await db.users.count_documents({"tenantId": tenant_id})
    product_count = await db.products.count_documents({"tenantId": tenant_id})
    invoice_count = await db.invoices.count_documents({"tenantId": tenant_id})
    
    result = serialize_doc(tenant)
    result["stats"] = {
        "users": user_count,
        "products": product_count,
        "invoices": invoice_count
    }
    
    return result


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_tenant(tenant_data: TenantCreate, current_user: dict = Depends(require_super_admin)):
    """Create a new tenant with admin user"""
    from server import db
    
    # Generate unique tenant code
    code = generate_tenant_code(tenant_data.nameEn or tenant_data.name)
    
    # Check if code already exists
    existing = await db.tenants.find_one({"code": code})
    while existing:
        code = generate_tenant_code(tenant_data.nameEn or tenant_data.name)
        existing = await db.tenants.find_one({"code": code})
    
    # Check if email already exists
    existing_email = await db.tenants.find_one({"email": tenant_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
    
    # Set trial expiry (14 days)
    trial_expiry = datetime.now(timezone.utc) + timedelta(days=14)
    
    # Create tenant
    tenant_dict = {
        "code": code,
        "name": tenant_data.name,
        "nameEn": tenant_data.nameEn,
        "email": tenant_data.email,
        "phone": tenant_data.phone,
        "address": tenant_data.address,
        "addressEn": tenant_data.addressEn,
        "country": tenant_data.country,
        "status": "trial",
        "settings": tenant_data.settings.model_dump(),
        "subscription": {
            **tenant_data.subscription.model_dump(),
            "expiryDate": trial_expiry
        },
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    
    result = await db.tenants.insert_one(tenant_dict)
    tenant_id = str(result.inserted_id)
    
    # Create admin user for this tenant
    admin_user = {
        "username": tenant_data.adminUsername,
        "email": tenant_data.adminEmail,
        "fullName": f"مدير {tenant_data.name}",
        "fullNameEn": f"{tenant_data.nameEn} Admin",
        "role": "tenant_admin",
        "status": "active",
        "permissions": DEFAULT_PERMISSIONS[UserRole.TENANT_ADMIN].model_dump(),
        "tenantId": tenant_id,
        "passwordHash": get_password_hash(tenant_data.adminPassword),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    
    await db.users.insert_one(admin_user)
    
    return {
        "message": "تم إنشاء الشركة بنجاح",
        "id": tenant_id,
        "code": code,
        "adminUsername": tenant_data.adminUsername
    }


@router.put("/{tenant_id}", response_model=dict)
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    current_user: dict = Depends(require_super_admin)
):
    """Update tenant information"""
    from server import db
    
    try:
        existing = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Build update dict
    update_dict = {"updatedAt": datetime.now(timezone.utc)}
    
    if tenant_data.name is not None:
        update_dict["name"] = tenant_data.name
    if tenant_data.nameEn is not None:
        update_dict["nameEn"] = tenant_data.nameEn
    if tenant_data.email is not None:
        update_dict["email"] = tenant_data.email
    if tenant_data.phone is not None:
        update_dict["phone"] = tenant_data.phone
    if tenant_data.address is not None:
        update_dict["address"] = tenant_data.address
    if tenant_data.addressEn is not None:
        update_dict["addressEn"] = tenant_data.addressEn
    if tenant_data.status is not None:
        update_dict["status"] = tenant_data.status
    if tenant_data.settings is not None:
        update_dict["settings"] = tenant_data.settings.model_dump()
    if tenant_data.subscription is not None:
        update_dict["subscription"] = tenant_data.subscription.model_dump()
    
    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": update_dict}
    )
    
    updated = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(updated)


@router.post("/{tenant_id}/extend-subscription", response_model=dict)
async def extend_subscription(
    tenant_id: str,
    days: int = Query(..., ge=1, le=365),
    current_user: dict = Depends(require_super_admin)
):
    """Extend tenant subscription by specified days"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Calculate new expiry
    current_expiry = tenant.get("subscription", {}).get("expiryDate") or datetime.now(timezone.utc)
    if current_expiry < datetime.now(timezone.utc):
        current_expiry = datetime.now(timezone.utc)
    
    new_expiry = current_expiry + timedelta(days=days)
    
    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {
            "$set": {
                "subscription.expiryDate": new_expiry,
                "status": "active",
                "updatedAt": datetime.now(timezone.utc)
            }
        }
    )
    
    return {
        "message": f"تم تمديد الاشتراك {days} يوم",
        "newExpiryDate": new_expiry.isoformat()
    }


@router.delete("/{tenant_id}", response_model=dict)
async def delete_tenant(tenant_id: str, current_user: dict = Depends(require_super_admin)):
    """Delete tenant and all associated data (DANGEROUS!)"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Delete all associated data
    await db.users.delete_many({"tenantId": tenant_id})
    await db.products.delete_many({"tenantId": tenant_id})
    await db.product_units.delete_many({"tenantId": tenant_id})
    await db.customers.delete_many({"tenantId": tenant_id})
    await db.suppliers.delete_many({"tenantId": tenant_id})
    await db.invoices.delete_many({"tenantId": tenant_id})
    await db.purchases.delete_many({"tenantId": tenant_id})
    await db.warehouses.delete_many({"tenantId": tenant_id})
    
    # Delete tenant
    await db.tenants.delete_one({"_id": ObjectId(tenant_id)})
    
    return {"message": "تم حذف الشركة وجميع بياناتها"}
