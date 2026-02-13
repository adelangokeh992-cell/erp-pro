"""
Authentication Routes
Handles login for both Super Admin and Tenant users
"""
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId

from models.user import UserLogin, UserCreate, UserRole, Token, DEFAULT_PERMISSIONS
from utils.auth import verify_password, get_password_hash, create_access_token, get_current_user
from utils.database import serialize_doc

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """
    Authenticate user and return JWT token
    - Super Admin: No tenant code required
    - Tenant Users: Tenant code required
    """
    from server import db
    
    # Find user by username
    user = await db.users.find_one({"username": login_data.username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة" if True else "Invalid username or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.get("passwordHash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة"
        )
    
    # Check if user is active
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="الحساب غير نشط"
        )
    
    # For non-super-admin, verify tenant
    tenant = None
    if user.get("role") != "super_admin":
        if not login_data.tenantCode and not user.get("tenantId"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رمز الشركة مطلوب"
            )
        
        # Get tenant
        tenant_query = {"code": login_data.tenantCode} if login_data.tenantCode else {"_id": ObjectId(user.get("tenantId"))}
        tenant = await db.tenants.find_one(tenant_query)
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="الشركة غير موجودة"
            )
        
        # Check tenant status
        if tenant.get("status") not in ["active", "trial"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="اشتراك الشركة منتهي أو موقوف"
            )
        
        # Check subscription expiry
        expiry = tenant.get("subscription", {}).get("expiryDate")
        if expiry and expiry < datetime.now(timezone.utc):
            # Update tenant status to expired
            await db.tenants.update_one(
                {"_id": tenant["_id"]},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="انتهى اشتراك الشركة"
            )
    
    # Update last login
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLogin": datetime.now(timezone.utc)}}
    )
    
    # Create token
    token_data = {
        "userId": str(user["_id"]),
        "username": user["username"],
        "role": user["role"],
        "tenantId": str(tenant["_id"]) if tenant else None
    }
    
    access_token = create_access_token(token_data)
    
    # Prepare response
    user_response = {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "fullName": user.get("fullName", ""),
        "role": user["role"],
        "permissions": user.get("permissions", {}),
    }
    
    tenant_response = None
    if tenant:
        tenant_response = {
            "id": str(tenant["_id"]),
            "code": tenant.get("code", ""),
            "name": tenant.get("name", ""),
            "nameEn": tenant.get("nameEn", ""),
            "settings": tenant.get("settings", {}),
            "subscription": tenant.get("subscription", {}),
        }
    
    return Token(
        access_token=access_token,
        user=user_response,
        tenant=tenant_response
    )


@router.post("/register-super-admin", response_model=dict)
async def register_super_admin(user_data: UserCreate):
    """
    Register the first super admin (only works if no super admin exists)
    """
    from server import db
    
    # Check if super admin already exists
    existing = await db.users.find_one({"role": "super_admin"})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin already exists"
        )
    
    # Create super admin
    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "fullName": user_data.fullName,
        "fullNameEn": user_data.fullNameEn,
        "phone": user_data.phone,
        "role": "super_admin",
        "status": "active",
        "permissions": DEFAULT_PERMISSIONS[UserRole.SUPER_ADMIN].model_dump(),
        "tenantId": None,
        "passwordHash": get_password_hash(user_data.password),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    
    result = await db.users.insert_one(user_dict)
    
    return {"message": "Super admin created successfully", "id": str(result.inserted_id)}


@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current logged in user information"""
    from server import db
    
    user = await db.users.find_one({"_id": ObjectId(current_user["userId"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tenant = None
    if current_user.get("tenantId"):
        tenant = await db.tenants.find_one({"_id": ObjectId(current_user["tenantId"])})
    
    return {
        "user": serialize_doc(user),
        "tenant": serialize_doc(tenant) if tenant else None
    }
