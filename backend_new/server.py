"""
Multi-Tenant ERP SaaS - Main Server
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "erp_saas")

client = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection lifecycle"""
    global client, db
    
    # Startup
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Create indexes
    await create_indexes()
    
    # Create default super admin if not exists
    await create_default_super_admin()
    
    print(f"✅ Connected to MongoDB: {DB_NAME}")
    
    yield
    
    # Shutdown
    client.close()
    print("👋 Disconnected from MongoDB")


async def create_indexes():
    """Create database indexes for better performance"""
    # Users indexes
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email")
    await db.users.create_index("tenantId")
    await db.users.create_index("role")
    
    # Tenants indexes
    await db.tenants.create_index("code", unique=True)
    await db.tenants.create_index("email", unique=True)
    await db.tenants.create_index("status")
    
    # Products indexes
    await db.products.create_index([("tenantId", 1), ("sku", 1)], unique=True)
    await db.products.create_index([("tenantId", 1), ("name", 1)])
    await db.products.create_index("rfidTag")
    await db.products.create_index("barcode")
    
    # Product Units indexes
    await db.product_units.create_index("rfidTag", unique=True)
    await db.product_units.create_index([("tenantId", 1), ("productId", 1)])
    
    # Invoices indexes
    await db.invoices.create_index([("tenantId", 1), ("invoiceNumber", 1)], unique=True)
    await db.invoices.create_index([("tenantId", 1), ("createdAt", -1)])
    
    # Purchases indexes
    await db.purchases.create_index([("tenantId", 1), ("purchaseNumber", 1)], unique=True)
    await db.purchases.create_index([("tenantId", 1), ("createdAt", -1)])
    
    print("📊 Database indexes created")


async def create_default_super_admin():
    """Create default super admin if none exists"""
    from utils.auth import get_password_hash
    from models.user import UserRole, DEFAULT_PERMISSIONS
    from datetime import datetime, timezone
    
    existing = await db.users.find_one({"role": "super_admin"})
    if not existing:
        admin = {
            "username": "superadmin",
            "email": "admin@erp-saas.com",
            "fullName": "مدير النظام",
            "fullNameEn": "Super Admin",
            "role": "super_admin",
            "status": "active",
            "permissions": DEFAULT_PERMISSIONS[UserRole.SUPER_ADMIN].model_dump(),
            "tenantId": None,
            "passwordHash": get_password_hash("Admin@123"),
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
        await db.users.insert_one(admin)
        print("🔐 Default super admin created: superadmin / Admin@123")


# Create FastAPI app
app = FastAPI(
    title="Multi-Tenant ERP SaaS",
    description="نظام ERP متعدد المستأجرين",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Import and register routes
from routes.auth import router as auth_router
from routes.tenants import router as tenants_router

app.include_router(auth_router, prefix="/api")
app.include_router(tenants_router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "database": "connected" if db is not None else "disconnected"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Multi-Tenant ERP SaaS API",
        "version": "2.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
