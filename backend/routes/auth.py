from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from models.auth import Token, LoginRequest, UserInDB
from models.user import UserCreate
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets
import os

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple secret key for JWT-like tokens
SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-change-in-production-123")
TOKEN_EXPIRE_HOURS = 24

# In-memory token storage (in production, use Redis)
active_tokens = {}

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return hash_password(plain_password) == hashed_password

def create_token(username: str, role: str) -> str:
    """Create a simple token"""
    token = secrets.token_hex(32)
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    active_tokens[token] = {
        "username": username,
        "role": role,
        "expires": expire
    }
    return token

def verify_token(token: str) -> Optional[dict]:
    """Verify token and return user data"""
    # First try JWT
    try:
        from jose import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except:
        pass
    
    # Fallback to old token store
    if token not in active_tokens:
        return None
    token_data = active_tokens[token]
    if datetime.now(timezone.utc) > token_data["expires"]:
        del active_tokens[token]
        return None
    return token_data


@router.post("/login", response_model=dict)
async def login(login_data: LoginRequest):
    """Login user - supports both regular and tenant login"""
    from server import db
    from jose import jwt
    
    username = login_data.username
    password = login_data.password
    tenant_code = getattr(login_data, 'tenantCode', None)
    
    user = await db.users.find_one({"username": username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة"
        )
    
    # Check for passwordHash (new format) or hashedPassword (old format) - order matters!
    stored_password = user.get("passwordHash") or user.get("hashedPassword") or user.get("hashed_password")
    
    if not stored_password:
        # First login - set password
        hashed = hash_password(password)
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"hashedPassword": hashed}}
        )
    else:
        # Try both hash methods (bcrypt first when hash looks like bcrypt)
        password_valid = False
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        # Bcrypt hashes start with $2b$ or $2a$ - try these first
        if stored_password and (stored_password.startswith("$2b$") or stored_password.startswith("$2a$")):
            try:
                if pwd_context.verify(password, stored_password):
                    password_valid = True
            except Exception:
                pass

        # Otherwise try SHA256 (old method)
        if not password_valid and verify_password(password, stored_password):
            password_valid = True

        # Last: try bcrypt for any other stored format
        if not password_valid and stored_password:
            try:
                if pwd_context.verify(password, stored_password):
                    password_valid = True
            except Exception:
                pass

        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="اسم المستخدم أو كلمة المرور غير صحيحة"
            )
    
    # Reject if account explicitly inactive or status not active (missing = active)
    if user.get("isActive") is False or (user.get("status") or "active") != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="الحساب غير نشط"
        )
    
    # Handle tenant login
    tenant = None
    tenant_id = user.get("tenantId")
    
    if user.get("role") != "super_admin":
        # For tenant users, try to get tenant from user or from code
        if tenant_code:
            tenant = await db.tenants.find_one({"code": tenant_code})
            if tenant:
                tenant_id = str(tenant["_id"])
        elif tenant_id:
            from bson import ObjectId
            tenant = await db.tenants.find_one({"_id": ObjectId(tenant_id)})
        
        if tenant:
            # Check tenant status
            if tenant.get("status") not in ["active", "trial"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="اشتراك الشركة منتهي أو موقوف"
                )
    
    # Create JWT token with tenant info
    token_payload = {
        "userId": str(user["_id"]),
        "username": user["username"],
        "role": user.get("role", "worker"),
        "tenantId": tenant_id
    }
    
    # Create JWT token
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    token_payload["exp"] = expire
    token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")
    
    # Build user response
    user_response = {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user.get("email", ""),
        "fullName": user.get("fullName", user.get("name", "")),
        "fullNameEn": user.get("fullNameEn", user.get("nameEn", "")),
        "role": user.get("role", "worker"),
        "permissions": user.get("permissions", {}),
    }
    
    # Build tenant response
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
    
    return {
        "access_token": token, 
        "token_type": "bearer",
        "user": user_response,
        "tenant": tenant_response
    }

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate, password: str = "123456"):
    """Register new user (admin only in production)"""
    from server import db
    
    # Check if username exists
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم موجود مسبقاً")
    
    # Check if email exists
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني موجود مسبقاً")
    
    user_dict = user.model_dump()
    user_dict["hashedPassword"] = hash_password(password)
    user_dict["createdAt"] = datetime.now(timezone.utc)
    user_dict["updatedAt"] = datetime.now(timezone.utc)
    
    result = await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    created_user["_id"] = str(created_user["_id"])
    del created_user["hashedPassword"]
    
    return created_user

@router.get("/me", response_model=dict)
async def get_current_user(token: str):
    """Get current user from token"""
    from server import db
    
    token_data = verify_token(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز الدخول غير صالح أو منتهي الصلاحية"
        )
    
    user = await db.users.find_one({"username": token_data["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    user["_id"] = str(user["_id"])
    if "hashedPassword" in user:
        del user["hashedPassword"]
    
    return user

@router.post("/logout")
async def logout(token: str):
    """Logout user"""
    if token in active_tokens:
        del active_tokens[token]
    return {"message": "تم تسجيل الخروج بنجاح"}

@router.post("/change-password")
async def change_password(token: str, old_password: str, new_password: str):
    """Change user password"""
    from server import db
    
    token_data = verify_token(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="رمز الدخول غير صالح"
        )
    
    user = await db.users.find_one({"username": token_data["username"]})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    stored_password = user.get("hashedPassword")
    if stored_password and not verify_password(old_password, stored_password):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashedPassword": hash_password(new_password)}}
    )
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

# Role-based permission checking
ROLE_PERMISSIONS = {
    "admin": ["*"],  # All permissions
    "manager": ["read", "write", "delete", "reports"],
    "accountant": ["read", "write", "accounting", "reports"],
    "worker": ["read", "write_limited"]
}

def check_permission(role: str, required_permission: str) -> bool:
    """Check if role has required permission"""
    permissions = ROLE_PERMISSIONS.get(role, [])
    return "*" in permissions or required_permission in permissions
