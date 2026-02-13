"""
Tenants Routes - Super Admin Management
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.password_policy import validate_password, validate_password_en

router = APIRouter(prefix="/api/tenants", tags=["Tenants"])


# Helper function for password hashing
def get_password_hash(password: str) -> str:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


def generate_tenant_code(name: str) -> str:
    import re
    import random
    import string
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name)
    prefix = clean_name[:4].upper() if len(clean_name) >= 4 else clean_name.upper()
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"{prefix}{suffix}"


def serialize_doc(doc):
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            result[key] = value
    return result


@router.get("")
async def get_all_tenants(
    status: Optional[str] = None,
    plan: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
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
    
    result = []
    for tenant in tenants:
        tenant_id = str(tenant["_id"])
        user_count = await db.users.count_documents({"tenantId": tenant_id})
        product_count = await db.products.count_documents({"tenantId": tenant_id})
        
        tenant_data = serialize_doc(tenant)
        tenant_data["userCount"] = user_count
        tenant_data["productCount"] = product_count
        tenant_data["lastSync"] = tenant.get("offlineSync", {}).get("lastSync")
        result.append(tenant_data)
    
    return result


@router.get("/stats")
async def get_tenant_stats():
    """Get overall tenant statistics"""
    from server import db
    
    total = await db.tenants.count_documents({})
    active = await db.tenants.count_documents({"status": "active"})
    trial = await db.tenants.count_documents({"status": "trial"})
    expired = await db.tenants.count_documents({"status": "expired"})
    suspended = await db.tenants.count_documents({"status": "suspended"})
    
    free_count = await db.tenants.count_documents({"subscription.plan": "free"})
    basic = await db.tenants.count_documents({"subscription.plan": "basic"})
    professional = await db.tenants.count_documents({"subscription.plan": "professional"})
    enterprise = await db.tenants.count_documents({"subscription.plan": "enterprise"})
    
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
            "free": free_count,
            "basic": basic,
            "professional": professional,
            "enterprise": enterprise
        },
        "expiringSoon": expiring_soon
    }


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: str):
    """Get single tenant by ID"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
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


@router.get("/{tenant_id}/settings")
async def get_tenant_settings(tenant_id: str):
    """Get tenant settings for frontend"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    settings = tenant.get("settings", {})
    subscription = tenant.get("subscription", {})
    
    # Get current counts for limit checking
    user_count = await db.users.count_documents({"tenantId": tenant_id})
    product_count = await db.products.count_documents({"tenantId": tenant_id})
    warehouse_count = await db.warehouses.count_documents({"tenantId": tenant_id})
    
    # Get this month's invoice count
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    invoice_count_month = await db.invoices.count_documents({
        "tenantId": tenant_id,
        "createdAt": {"$gte": month_start}
    })
    
    return {
        "enabledFeatures": settings.get("enabledFeatures", {
            "dashboard": True, "products": True, "customers": True,
            "suppliers": True, "invoices": True, "purchases": True,
            "pos": True, "warehouses": True, "reports": True,
            "accounting": True, "rfid": True, "esl": False, "offline": True
        }),
        "customFields": settings.get("customFields", []),
        "invoiceTemplate": settings.get("invoiceTemplate", {}),
        "limits": {
            "maxUsers": subscription.get("maxUsers", 5),
            "maxProducts": subscription.get("maxProducts", 1000),
            "maxWarehouses": subscription.get("maxWarehouses", 1),
            "maxInvoicesPerMonth": subscription.get("maxInvoicesPerMonth", -1),
            "storageLimit": subscription.get("storageLimit", 1024)
        },
        "currentUsage": {
            "users": user_count,
            "products": product_count,
            "warehouses": warehouse_count,
            "invoicesThisMonth": invoice_count_month
        }
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tenant(tenant_data: dict):
    """Create a new tenant with admin user"""
    from server import db
    
    code = generate_tenant_code(tenant_data.get("nameEn") or tenant_data.get("name", "COMP"))
    
    existing = await db.tenants.find_one({"code": code})
    while existing:
        code = generate_tenant_code(tenant_data.get("nameEn") or tenant_data.get("name", "COMP"))
        existing = await db.tenants.find_one({"code": code})
    
    existing_email = await db.tenants.find_one({"email": tenant_data.get("email")})
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

    admin_password = tenant_data.get("adminPassword", "123456")
    valid, err = validate_password(admin_password)
    if not valid:
        valid_en, err_en = validate_password_en(admin_password)
        raise HTTPException(status_code=400, detail=err_en if not valid_en else err)

    trial_expiry = datetime.now(timezone.utc) + timedelta(days=14)
    
    settings = tenant_data.get("settings", {})
    subscription = tenant_data.get("subscription", {})
    
    tenant_dict = {
        "code": code,
        "name": tenant_data.get("name"),
        "nameEn": tenant_data.get("nameEn"),
        "email": tenant_data.get("email"),
        "phone": tenant_data.get("phone"),
        "address": tenant_data.get("address"),
        "addressEn": tenant_data.get("addressEn"),
        "country": tenant_data.get("country", "SA"),
        "status": "trial",
        "settings": {
            "language": settings.get("language", "ar"),
            "currency": settings.get("currency", "USD"),
            "currencySymbol": settings.get("currencySymbol", "$"),
            "timezone": settings.get("timezone", "Asia/Riyadh"),
            "enableRFID": settings.get("enableRFID", True),
            "enableESL": settings.get("enableESL", False),
            "enableOfflineMode": settings.get("enableOfflineMode", True),
            "customFields": [],
            "invoiceTemplate": {
                "logo": None,
                "companyName": tenant_data.get("name", ""),
                "companyNameEn": tenant_data.get("nameEn", ""),
                "address": tenant_data.get("address", ""),
                "phone": tenant_data.get("phone", ""),
                "email": tenant_data.get("email", ""),
                "showLogo": True,
                "primaryColor": "#1a56db"
            }
        },
        "subscription": {
            "plan": subscription.get("plan", "free"),
            "subscriptionType": subscription.get("subscriptionType", "monthly"),
            "maxUsers": subscription.get("maxUsers", 5),
            "maxProducts": subscription.get("maxProducts", 1000),
            "maxWarehouses": subscription.get("maxWarehouses", 1),
            "startDate": datetime.now(timezone.utc),
            "expiryDate": trial_expiry,
            "price": subscription.get("price", 0),
            "autoRenew": False,
            "features": []
        },
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    
    result = await db.tenants.insert_one(tenant_dict)
    tenant_id = str(result.inserted_id)
    
    admin_user = {
        "username": tenant_data.get("adminUsername"),
        "email": tenant_data.get("adminEmail"),
        "fullName": f"مدير {tenant_data.get('name', '')}",
        "fullNameEn": f"{tenant_data.get('nameEn', '')} Admin",
        "role": "tenant_admin",
        "status": "active",
        "permissions": {
            "dashboard": True, "products": True, "products_create": True, "products_edit": True, "products_delete": True,
            "customers": True, "customers_create": True, "customers_edit": True,
            "suppliers": True, "suppliers_create": True, "suppliers_edit": True,
            "purchases": True, "purchases_create": True, "purchases_edit": True,
            "invoices": True, "invoices_create": True, "invoices_edit": True,
            "pos": True, "inventory_count": True, "reports": True, "accounting": True, "settings": True, "users": True, "warehouses": True
        },
        "tenantId": tenant_id,
        "passwordHash": get_password_hash(admin_password),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    
    await db.users.insert_one(admin_user)

    # إعدادات افتراضية للشركة (عملة، سعر صرف، وضع التشغيل)
    tenant_settings = tenant_dict.get("settings", {})
    currency = tenant_settings.get("currency", "USD")
    default_settings = [
        {"key": "exchangeRate", "value": "15000", "tenantId": tenant_id, "updatedAt": datetime.now(timezone.utc)},
        {"key": "operationMode", "value": "local", "tenantId": tenant_id, "updatedAt": datetime.now(timezone.utc)},
        {"key": "currency", "value": currency, "tenantId": tenant_id, "updatedAt": datetime.now(timezone.utc)},
    ]
    await db.settings.insert_many(default_settings)

    # Send welcome email if SMTP configured
    try:
        from services.email_service import send_welcome_email
        await send_welcome_email(
            tenant_name=tenant_dict.get("name", ""),
            tenant_email=tenant_dict.get("email", ""),
            tenant_code=code,
        )
    except Exception:
        pass  # Non-blocking

    return {
        "message": "تم إنشاء الشركة بنجاح",
        "id": tenant_id,
        "code": code,
        "adminUsername": tenant_data.get("adminUsername")
    }


@router.put("/{tenant_id}")
async def update_tenant(tenant_id: str, tenant_data: dict):
    """Update tenant information"""
    from server import db
    
    try:
        existing = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_dict = {"updatedAt": datetime.now(timezone.utc)}
    
    for field in ["name", "nameEn", "email", "phone", "address", "addressEn", "status", "settings", "subscription"]:
        if field in tenant_data and tenant_data[field] is not None:
            update_dict[field] = tenant_data[field]
    
    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {"$set": update_dict}
    )
    
    updated = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    return serialize_doc(updated)


@router.post("/{tenant_id}/extend-subscription")
async def extend_subscription(tenant_id: str, days: int = Query(..., ge=1, le=365)):
    """Extend tenant subscription by specified days"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
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


@router.delete("/{tenant_id}")
async def delete_tenant(tenant_id: str):
    """Delete tenant and all associated data"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    await db.users.delete_many({"tenantId": tenant_id})
    await db.products.delete_many({"tenantId": tenant_id})
    await db.product_units.delete_many({"tenantId": tenant_id})
    await db.customers.delete_many({"tenantId": tenant_id})
    await db.suppliers.delete_many({"tenantId": tenant_id})
    await db.invoices.delete_many({"tenantId": tenant_id})
    await db.purchases.delete_many({"tenantId": tenant_id})
    await db.warehouses.delete_many({"tenantId": tenant_id})
    
    await db.tenants.delete_one({"_id": ObjectId(tenant_id)})
    
    return {"message": "تم حذف الشركة وجميع بياناتها"}



@router.post("/{tenant_id}/sync-status")
async def update_sync_status(tenant_id: str, sync_data: dict):
    """Update tenant's last sync time (called by client after successful sync)"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Update sync status
    await db.tenants.update_one(
        {"_id": ObjectId(tenant_id)},
        {
            "$set": {
                "offlineSync.lastSync": sync_data.get("lastSync"),
                "offlineSync.deviceInfo": sync_data.get("deviceInfo"),
                "updatedAt": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message": "تم تحديث حالة المزامنة"}


@router.get("/{tenant_id}/sync-status")
async def get_sync_status(tenant_id: str):
    """Get tenant's last sync time"""
    from server import db
    
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return tenant.get("offlineSync", {})