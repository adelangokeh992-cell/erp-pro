from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import warnings
from pathlib import Path
from datetime import datetime, timezone
import asyncio

warnings.filterwarnings("ignore", message=".*bcrypt version.*", module="passlib")

# Import routes
from routes import (
    products,
    customers,
    esl,
    invoices,
    suppliers,
    purchases,
    users,
    warehouses,
    dashboard,
    reports,
    accounting,
    auth,
    product_units,
    tenants,
    auth_v2,
    subscriptions,
    licenses,
    sync,
    audit,
    backup,
    support,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Sentry - error monitoring (optional, set SENTRY_DSN in .env)
_sentry_dsn = os.environ.get("SENTRY_DSN", "").strip()
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        traces_sample_rate=0.1,
        environment=os.environ.get("SENTRY_ENV", "production"),
    )
    logger.info("Sentry initialized for error monitoring")

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection (defaults: local MongoDB + database erp_local)
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'erp_local')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# CORS: use CORS_ORIGINS env (comma-separated) or "*" for dev
_cors_origins = os.environ.get("CORS_ORIGINS", "*")
CORS_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()] if _cors_origins != "*" else ["*"]
if CORS_ORIGINS == ["*"]:
    logger.warning("CORS allow_origins=* - restrict CORS_ORIGINS in production (e.g. https://yourdomain.com)")

# SECRET_KEY warning
if os.environ.get("SECRET_KEY", "").strip() in ("", "super-secret-key-change-in-production-123"):
    logger.warning("SECRET_KEY is default! Set SECRET_KEY in .env for production.")

# Create the main app without a prefix
app = FastAPI(
    title="ERP API",
    description="نظام إدارة موارد مؤسسية متعدد الشركات",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Rate limiting - default 200/min per IP, override via RATE_LIMIT env (e.g. "100/minute")
_rate_limit = os.environ.get("RATE_LIMIT", "200/minute")
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=[_rate_limit])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Test route
@api_router.get("/")
async def root():
    return {"message": "ERP API Server Running"}

# Health check (no rate limit for monitoring)
@api_router.get("/health")
async def health_check():
    try:
        await client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "healthy" if db_status == "connected" else "degraded", "database": db_status}

# Include routers (they already have /api prefix in their routes)
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(esl.router)
app.include_router(invoices.router)
app.include_router(suppliers.router)
app.include_router(purchases.router)
app.include_router(users.router)
app.include_router(warehouses.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(accounting.router)
app.include_router(auth_v2.router)  # login first (same /api/auth prefix)
app.include_router(auth.router)
app.include_router(product_units.router)
app.include_router(tenants.router)
app.include_router(subscriptions.router)
app.include_router(licenses.router)
app.include_router(sync.router)
app.include_router(audit.router)
app.include_router(backup.router)
app.include_router(support.router)

# Include the basic api router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTPS redirect in production (set FORCE_HTTPS=true)
if os.environ.get("FORCE_HTTPS", "").lower() in ("true", "1", "yes"):
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request

    class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            if request.url.scheme == "http":
                url = request.url.replace(scheme="https")
                from starlette.responses import RedirectResponse
                return RedirectResponse(url=str(url), status_code=301)
            return await call_next(request)

    app.add_middleware(HTTPSRedirectMiddleware)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Seed database with initial data on startup
@app.on_event("startup")
async def seed_database():
    """Seed database with initial data if empty"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Create or fix Super Admin so login always works with: superadmin / Admin@123
    super_admin = await db.users.find_one({"role": "super_admin"})
    default_password_hash = pwd_context.hash("Admin@123")
    if not super_admin:
        logger.info("Creating default Super Admin...")
        admin = {
            "username": "superadmin",
            "email": "admin@erp-saas.com",
            "fullName": "مدير النظام",
            "fullNameEn": "Super Admin",
            "role": "super_admin",
            "status": "active",
            "isActive": True,
            "permissions": {
                "dashboard": True, "products": True, "products_create": True, "products_edit": True, "products_delete": True,
                "customers": True, "customers_create": True, "customers_edit": True,
                "suppliers": True, "suppliers_create": True, "suppliers_edit": True,
                "purchases": True, "purchases_create": True, "purchases_edit": True,
                "invoices": True, "invoices_create": True, "invoices_edit": True,
                "pos": True, "inventory_count": True, "reports": True, "accounting": True, "settings": True, "users": True, "warehouses": True
            },
            "tenantId": None,
            "passwordHash": default_password_hash,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
        await db.users.insert_one(admin)
        logger.info("✅ Super Admin created: superadmin / Admin@123")
    else:
        # Ensure superadmin password is always Admin@123 (for documented test credentials)
        await db.users.update_one(
            {"role": "super_admin"},
            {"$set": {"passwordHash": default_password_hash, "status": "active", "isActive": True, "updatedAt": datetime.now(timezone.utc)}}
        )
        logger.info("✅ Super Admin credentials set: superadmin / Admin@123")
    
    # Ensure DEMO tenant and demo user exist so login DEMO / demo / Demo@123 works after every restart
    demo_tenant = await db.tenants.find_one({"code": "DEMO"})
    if not demo_tenant:
        from datetime import timedelta
        now_utc = datetime.now(timezone.utc)
        trial_end = now_utc + timedelta(days=30)
        demo_tenant_doc = {
            "code": "DEMO",
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
                "startDate": now_utc,
                "expiryDate": trial_end,
            },
            "createdAt": now_utc,
            "updatedAt": now_utc,
        }
        r = await db.tenants.insert_one(demo_tenant_doc)
        demo_tenant_id = str(r.inserted_id)
        logger.info("Created DEMO tenant")
    else:
        demo_tenant_id = str(demo_tenant["_id"])
    demo_user = await db.users.find_one({"username": "demo", "tenantId": demo_tenant_id})
    demo_pass_hash = pwd_context.hash("Demo@123")
    if demo_user:
        await db.users.update_one(
            {"_id": demo_user["_id"]},
            {"$set": {"passwordHash": demo_pass_hash, "status": "active", "updatedAt": datetime.now(timezone.utc)}}
        )
        logger.info("✅ Demo user password set: DEMO / demo / Demo@123")
    else:
        now_utc = datetime.now(timezone.utc)
        await db.users.insert_one({
            "username": "demo",
            "email": "demo@demo.sy",
            "fullName": "مدير التجريبي",
            "fullNameEn": "Demo Admin",
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
            "tenantId": demo_tenant_id,
            "passwordHash": demo_pass_hash,
            "createdAt": now_utc,
            "updatedAt": now_utc,
        })
        logger.info("✅ Demo user created: DEMO / demo / Demo@123")
    
    # Create indexes for tenants
    await db.tenants.create_index("code", unique=True, sparse=True)
    await db.tenants.create_index("email", unique=True, sparse=True)
    
    # Check if products collection is empty
    product_count = await db.products.count_documents({})
    if product_count == 0:
        logger.info("Seeding database with initial products...")
        
        initial_products = [
            {
                "name": "لابتوب Dell XPS 15",
                "nameEn": "Dell XPS 15 Laptop",
                "sku": "DELL-XPS-15",
                "barcode": "1234567890123",
                "rfidTag": "RFID-001-XPS",
                "category": "إلكترونيات",
                "categoryEn": "Electronics",
                "stock": 25,
                "costPrice": 4500,
                "salePrice": 5500,
                "reorderLevel": 10,
                "warehouseId": None,
                "eslDeviceId": "ESL-001",
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            },
            {
                "name": "هاتف iPhone 15 Pro",
                "nameEn": "iPhone 15 Pro",
                "sku": "APPLE-IP15P",
                "barcode": "2234567890124",
                "rfidTag": "RFID-002-IP15",
                "category": "إلكترونيات",
                "categoryEn": "Electronics",
                "stock": 8,
                "costPrice": 5000,
                "salePrice": 6000,
                "reorderLevel": 15,
                "warehouseId": None,
                "eslDeviceId": "ESL-002",
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            },
            {
                "name": "شاشة Samsung 32 بوصة",
                "nameEn": 'Samsung 32" Monitor',
                "sku": "SAM-MON-32",
                "barcode": "3234567890125",
                "rfidTag": "RFID-003-SAM",
                "category": "إلكترونيات",
                "categoryEn": "Electronics",
                "stock": 45,
                "costPrice": 800,
                "salePrice": 1000,
                "reorderLevel": 20,
                "warehouseId": None,
                "eslDeviceId": "ESL-003",
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            },
            {
                "name": "لوحة مفاتيح ميكانيكية",
                "nameEn": "Mechanical Keyboard",
                "sku": "KEY-MECH-001",
                "barcode": "4234567890126",
                "rfidTag": "RFID-004-KEY",
                "category": "ملحقات",
                "categoryEn": "Accessories",
                "stock": 120,
                "costPrice": 150,
                "salePrice": 200,
                "reorderLevel": 30,
                "warehouseId": None,
                "eslDeviceId": "ESL-004",
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            },
            {
                "name": "ماوس لاسلكي",
                "nameEn": "Wireless Mouse",
                "sku": "MOUSE-WL-001",
                "barcode": "5234567890127",
                "rfidTag": "RFID-005-MOUSE",
                "category": "ملحقات",
                "categoryEn": "Accessories",
                "stock": 6,
                "costPrice": 50,
                "salePrice": 75,
                "reorderLevel": 50,
                "warehouseId": None,
                "eslDeviceId": "ESL-005",
                "createdAt": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc)
            }
        ]
        
        await db.products.insert_many(initial_products)
        logger.info(f"Seeded {len(initial_products)} products")
    
    # Seed ESL devices
    esl_count = await db.esl_devices.count_documents({})
    if esl_count == 0:
        logger.info("Seeding ESL devices...")
        
        initial_esl = [
            {"deviceId": "ESL-001", "productId": "1", "status": "online", "battery": 85, "lastUpdate": datetime.now(timezone.utc), "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)},
            {"deviceId": "ESL-002", "productId": "2", "status": "online", "battery": 92, "lastUpdate": datetime.now(timezone.utc), "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)},
            {"deviceId": "ESL-003", "productId": "3", "status": "offline", "battery": 15, "lastUpdate": datetime.now(timezone.utc), "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)},
            {"deviceId": "ESL-004", "productId": "4", "status": "online", "battery": 78, "lastUpdate": datetime.now(timezone.utc), "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)},
            {"deviceId": "ESL-005", "productId": "5", "status": "online", "battery": 45, "lastUpdate": datetime.now(timezone.utc), "createdAt": datetime.now(timezone.utc), "updatedAt": datetime.now(timezone.utc)},
        ]
        
        await db.esl_devices.insert_many(initial_esl)
        logger.info(f"Seeded {len(initial_esl)} ESL devices")
    
    # Seed settings
    settings_count = await db.settings.count_documents({})
    if settings_count == 0:
        logger.info("Seeding settings...")
        
        initial_settings = [
            {"key": "exchangeRate", "value": "15000", "updatedAt": datetime.now(timezone.utc)},
            {"key": "operationMode", "value": "local", "updatedAt": datetime.now(timezone.utc)},
            {"key": "currency", "value": "SYP", "updatedAt": datetime.now(timezone.utc)},
        ]
        
        await db.settings.insert_many(initial_settings)
        logger.info(f"Seeded {len(initial_settings)} settings")


@app.on_event("startup")
async def schedule_subscription_checker():
    """
    Background task to auto-suspend tenants with expired subscriptions.
    Uses the same logic as POST /api/licenses/suspend-expired.
    Interval: SUSPEND_CHECK_INTERVAL_SECONDS (default 3600 = 1 hour).
    Disable in-app scheduler: set SUSPEND_AUTO_RUN=false and use cron/Task Scheduler instead.
    """
    from routes.licenses import run_suspend_expired

    if os.environ.get("SUSPEND_AUTO_RUN", "true").lower() in ("false", "0", "no"):
        logger.info("Auto-suspend (in-app): disabled (SUSPEND_AUTO_RUN=false). Use cron or Task Scheduler.")
        return

    interval_sec = int(os.environ.get("SUSPEND_CHECK_INTERVAL_SECONDS", "3600"))
    if interval_sec < 60:
        interval_sec = 3600
    logger.info("Auto-suspend (in-app): running every %s seconds", interval_sec)

    async def checker():
        while True:
            try:
                suspended_count, run_at = await run_suspend_expired(db)
                if suspended_count:
                    logger.info("Auto-suspend: marked %s tenant(s) as expired at %s", suspended_count, run_at.isoformat())
            except Exception as e:
                logger.exception("Auto-suspend task failed: %s", e)
            await asyncio.sleep(interval_sec)

    asyncio.create_task(checker())
