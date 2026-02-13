"""
Authentication Routes V2 - Multi-Tenant Support
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from passlib.context import CryptContext
from jose import jwt
import os
import secrets

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_DEFAULT_SECRET = "super-secret-key-change-in-production-123"
SECRET_KEY = os.environ.get("SECRET_KEY", _DEFAULT_SECRET)
ALGORITHM = "HS256"

# SECRET_KEY: Set in .env for production. Default is insecure.
ACCESS_TOKEN_EXPIRE_HOURS = 24


def verify_password_bcrypt(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password or not (hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$")):
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def serialize_doc(doc):
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "passwordHash":
            continue
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            result[key] = value
    return result


@router.get("/fix-superadmin")
async def fix_superadmin():
    """إصلاح حساب superadmin: إنشاؤه أو ضبط كلمة المرور إلى Admin@123 (افتح هذا الرابط في المتصفح ثم جرّب الدخول)."""
    from server import db
    default_hash = get_password_hash("Admin@123")
    u = await db.users.find_one({"username": "superadmin"})
    if not u:
        await db.users.insert_one({
            "username": "superadmin",
            "email": "admin@erp-saas.com",
            "fullName": "مدير النظام",
            "fullNameEn": "Super Admin",
            "role": "super_admin",
            "status": "active",
            "isActive": True,
            "tenantId": None,
            "passwordHash": default_hash,
            "permissions": {},
        })
        return {"ok": True, "message": "تم إنشاء superadmin. جرّب الدخول: superadmin / Admin@123"}
    await db.users.update_one(
        {"username": "superadmin"},
        {"$set": {"passwordHash": default_hash, "status": "active", "isActive": True}}
    )
    return {"ok": True, "message": "تم ضبط كلمة المرور. جرّب الدخول: superadmin / Admin@123"}


@router.get("/check-setup")
async def check_setup():
    """Diagnostic: check if superadmin exists and has password (for login troubleshooting)."""
    from server import db
    u = await db.users.find_one({"username": "superadmin"})
    if not u:
        return {"superadmin_exists": False, "has_password": False, "message": "المستخدم superadmin غير موجود. أعد تشغيل الـ Backend."}
    stored = u.get("passwordHash") or u.get("hashedPassword") or u.get("hashed_password")
    return {
        "superadmin_exists": True,
        "has_password": bool(stored),
        "status": u.get("status"),
        "message": "جاهز لتسجيل الدخول: superadmin / Admin@123" if stored else "كلمة المرور غير مضبوطة. أعد تشغيل الـ Backend."
    }


DEMO_TENANT_CODE = "DEMO"
DEMO_USERNAME = "demo"
DEMO_PASSWORD = "Demo@123"


@router.get("/fix-demo-user")
async def fix_demo_user():
    """إنشاء أو إصلاح شركة DEMO ومستخدم demo بكلمة المرور Demo@123. افتح الرابط مرة واحدة ثم جرّب الدخول."""
    from server import db
    now = datetime.now(timezone.utc)
    tenant = await db.tenants.find_one({"code": DEMO_TENANT_CODE})
    if not tenant:
        trial_end = now + timedelta(days=30)
        tenant_doc = {
            "code": DEMO_TENANT_CODE,
            "name": "شركة تجريبية",
            "nameEn": "Demo Company",
            "email": "demo@demo.sy",
            "phone": "0900000000",
            "address": "عنوان تجريبي",
            "addressEn": "Demo Address",
            "country": "SY",
            "status": "active",
            "settings": {"language": "ar", "currency": "USD", "currencySymbol": "$", "timezone": "Asia/Damascus"},
            "subscription": {
                "plan": "trial",
                "subscriptionType": "monthly",
                "maxUsers": 10,
                "maxProducts": 5000,
                "startDate": now,
                "expiryDate": trial_end,
            },
            "createdAt": now,
            "updatedAt": now,
        }
        r = await db.tenants.insert_one(tenant_doc)
        tenant_id = str(r.inserted_id)
    else:
        tenant_id = str(tenant["_id"])
    hash_pass = get_password_hash(DEMO_PASSWORD)
    perms = {
        "dashboard": True, "products": True, "products_create": True, "products_edit": True, "products_delete": True,
        "customers": True, "customers_create": True, "customers_edit": True,
        "suppliers": True, "suppliers_create": True, "suppliers_edit": True,
        "purchases": True, "purchases_create": True, "purchases_edit": True,
        "invoices": True, "invoices_create": True, "invoices_edit": True,
        "pos": True, "inventory_count": True, "reports": True, "accounting": True, "settings": True, "users": True, "warehouses": True
    }
    u = await db.users.find_one({"username": DEMO_USERNAME, "tenantId": tenant_id})
    if u:
        await db.users.update_one(
            {"_id": u["_id"]},
            {"$set": {"passwordHash": hash_pass, "status": "active", "updatedAt": now}}
        )
        return {"ok": True, "message": f"تم ضبط كلمة المرور. جرّب الدخول: {DEMO_TENANT_CODE} / {DEMO_USERNAME} / {DEMO_PASSWORD}"}
    await db.users.insert_one({
        "username": DEMO_USERNAME,
        "email": "demo@demo.sy",
        "fullName": "مدير التجريبي",
        "fullNameEn": "Demo Admin",
        "role": "tenant_admin",
        "status": "active",
        "permissions": perms,
        "tenantId": tenant_id,
        "passwordHash": hash_pass,
        "createdAt": now,
        "updatedAt": now,
    })
    return {"ok": True, "message": f"تم إنشاء مستخدم التجربة. جرّب الدخول: {DEMO_TENANT_CODE} / {DEMO_USERNAME} / {DEMO_PASSWORD}"}


@router.post("/login")
async def login(login_data: dict):
    """
    Authenticate user and return JWT token
    - Super Admin: No tenant code required
    - Tenant Users: Tenant code required
    """
    from server import db
    
    username = (login_data.get("username") or "").strip()
    password = login_data.get("password") or ""
    raw_tenant = login_data.get("tenantCode")
    tenant_code = (raw_tenant or "").strip().upper() if isinstance(raw_tenant, str) else None
    if tenant_code == "":
        tenant_code = None
    
    # عند وجود رمز الشركة: نحدد المستخدم حسب الشركة لتفادي تداخل أسماء المستخدمين
    if tenant_code:
        tenant = await db.tenants.find_one({"code": tenant_code})
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="الشركة غير موجودة"
            )
        user = await db.users.find_one({"username": username, "tenantId": str(tenant["_id"])})
    else:
        # مدير النظام: بدون tenantId أو tenantId = null
        user = await db.users.find_one({"username": username, "$or": [{"tenantId": None}, {"tenantId": {"$exists": False}}]})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة"
        )
    
    # Accept passwordHash (bcrypt) or hashedPassword / hashed_password (SHA256 or bcrypt)
    stored = user.get("passwordHash") or user.get("hashedPassword") or user.get("hashed_password")
    password_ok = False
    if stored:
        if stored.startswith("$2b$") or stored.startswith("$2a$"):
            password_ok = verify_password_bcrypt(password, stored)
        if not password_ok:
            import hashlib
            if hashlib.sha256(password.encode()).hexdigest() == stored:
                password_ok = True
        if not password_ok:
            password_ok = verify_password_bcrypt(password, stored)
    if not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة"
        )

    if (user.get("status") or "active") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="الحساب غير نشط"
        )
    
    tenant = None
    if user.get("role") != "super_admin":
        if not tenant_code and not user.get("tenantId"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="رمز الشركة مطلوب"
            )
        
        if tenant_code:
            tenant = await db.tenants.find_one({"code": tenant_code})
        elif user.get("tenantId"):
            tenant = await db.tenants.find_one({"_id": ObjectId(user.get("tenantId"))})
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="الشركة غير موجودة"
            )
        
        if tenant.get("status") not in ["active", "trial"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="اشتراك الشركة منتهي أو موقوف"
            )
        
        expiry = tenant.get("subscription", {}).get("expiryDate")
        if expiry and expiry < datetime.now(timezone.utc):
            await db.tenants.update_one(
                {"_id": tenant["_id"]},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="انتهى اشتراك الشركة"
            )
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"lastLogin": datetime.now(timezone.utc)}}
    )
    
    token_data = {
        "userId": str(user["_id"]),
        "username": user["username"],
        "role": user["role"],
        "tenantId": str(tenant["_id"]) if tenant else None
    }
    
    access_token = create_access_token(token_data)
    
    user_response = {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user.get("email", ""),
        "fullName": user.get("fullName", ""),
        "fullNameEn": user.get("fullNameEn", ""),
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
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response,
        "tenant": tenant_response
    }


@router.post("/forgot-password")
async def forgot_password(data: dict):
    """Request password reset - sends email if user exists and SMTP configured."""
    from server import db
    from services.email_service import send_password_reset_email, is_email_configured

    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مطلوب")

    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "إذا كان البريد مسجلاً، ستتلقى رابط استعادة كلمة المرور"}

    if not is_email_configured():
        raise HTTPException(status_code=503, detail="خدمة البريد غير مُعدّة. تواصل مع الدعم.")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one({
        "email": email,
        "token": token,
        "expiresAt": expires,
        "createdAt": datetime.now(timezone.utc),
    })

    lang = data.get("lang", "ar")
    sent = await send_password_reset_email(email, token, lang)
    if not sent:
        raise HTTPException(status_code=500, detail="فشل إرسال البريد")

    return {"message": "تم إرسال رابط استعادة كلمة المرور إلى بريدك"}


@router.post("/reset-password")
async def reset_password(data: dict):
    """Reset password using token from email."""
    from server import db

    token = (data.get("token") or "").strip()
    new_password = data.get("password") or ""
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="الرمز وكلمة المرور الجديدة مطلوبان")

    from utils.password_policy import validate_password, validate_password_en
    valid, err = validate_password(new_password)
    if not valid:
        valid_en, err_en = validate_password_en(new_password)
        raise HTTPException(status_code=400, detail=err_en if not valid_en else err)

    rec = await db.password_reset_tokens.find_one({"token": token})
    if not rec or rec.get("expiresAt", datetime.min) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="الرمز منتهي أو غير صالح")

    email = rec.get("email")
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"passwordHash": get_password_hash(new_password), "updatedAt": datetime.now(timezone.utc)}}
    )
    await db.password_reset_tokens.delete_many({"token": token})

    return {"message": "تم تغيير كلمة المرور بنجاح"}


@router.get("/me")
async def get_current_user_info(token: str = None):
    """Get current logged in user information"""
    from server import db
    from fastapi import Header

    return {"message": "Use Authorization header with Bearer token"}


@router.post("/register-super-admin")
async def register_super_admin(user_data: dict):
    """Register the first super admin (only works if no super admin exists)"""
    from server import db
    
    existing = await db.users.find_one({"role": "super_admin"})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin already exists"
        )
    
    admin = {
        "username": user_data.get("username"),
        "email": user_data.get("email"),
        "fullName": user_data.get("fullName", "مدير النظام"),
        "fullNameEn": user_data.get("fullNameEn", "Super Admin"),
        "phone": user_data.get("phone"),
        "role": "super_admin",
        "status": "active",
        "permissions": {
            "dashboard": True, "products": True, "products_create": True, "products_edit": True, "products_delete": True,
            "customers": True, "customers_create": True, "customers_edit": True,
            "suppliers": True, "suppliers_create": True, "suppliers_edit": True,
            "purchases": True, "purchases_create": True, "purchases_edit": True,
            "invoices": True, "invoices_create": True, "invoices_edit": True,
            "pos": True, "inventory_count": True, "reports": True, "accounting": True, "settings": True, "users": True, "warehouses": True
        },
        "tenantId": None,
        "passwordHash": get_password_hash(user_data.get("password")),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    
    result = await db.users.insert_one(admin)
    
    return {"message": "Super admin created successfully", "id": str(result.inserted_id)}
