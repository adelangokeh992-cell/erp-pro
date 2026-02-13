"""
User Model - Multi-Tenant User Management
Each user belongs to a tenant and has role-based permissions
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"  # Platform owner - can manage all tenants
    TENANT_ADMIN = "tenant_admin"  # Company admin - full access to their tenant
    MANAGER = "manager"  # Department manager - limited admin access
    ACCOUNTANT = "accountant"  # Financial access
    WAREHOUSE = "warehouse"  # Inventory and warehouse access
    CASHIER = "cashier"  # POS access only
    VIEWER = "viewer"  # Read-only access


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class UserPermissions(BaseModel):
    """Granular permissions for users"""
    dashboard: bool = True
    products: bool = True
    products_create: bool = False
    products_edit: bool = False
    products_delete: bool = False
    customers: bool = True
    customers_create: bool = False
    customers_edit: bool = False
    suppliers: bool = True
    suppliers_create: bool = False
    suppliers_edit: bool = False
    purchases: bool = True
    purchases_create: bool = False
    purchases_edit: bool = False
    invoices: bool = True
    invoices_create: bool = False
    invoices_edit: bool = False
    pos: bool = True
    inventory_count: bool = True
    reports: bool = True
    accounting: bool = False
    settings: bool = False
    users: bool = False
    warehouses: bool = True


class UserBase(BaseModel):
    """Base user model"""
    username: str
    email: EmailStr
    fullName: str
    fullNameEn: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole = UserRole.VIEWER
    status: UserStatus = UserStatus.ACTIVE
    permissions: UserPermissions = UserPermissions()
    tenantId: Optional[str] = None  # None for super_admin


class UserCreate(UserBase):
    """Model for creating a new user"""
    password: str


class UserUpdate(BaseModel):
    """Model for updating a user"""
    email: Optional[EmailStr] = None
    fullName: Optional[str] = None
    fullNameEn: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    permissions: Optional[UserPermissions] = None
    password: Optional[str] = None


class UserLogin(BaseModel):
    """Model for user login"""
    username: str
    password: str
    tenantCode: Optional[str] = None  # Required for non-super-admin users


class UserInDB(UserBase):
    """User model as stored in database"""
    id: str = Field(alias="_id")
    passwordHash: str
    lastLogin: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True


class TokenData(BaseModel):
    """JWT Token payload"""
    userId: str
    username: str
    role: UserRole
    tenantId: Optional[str] = None
    exp: datetime


class Token(BaseModel):
    """Authentication response"""
    access_token: str
    token_type: str = "bearer"
    user: dict
    tenant: Optional[dict] = None


# Role-based default permissions
DEFAULT_PERMISSIONS = {
    UserRole.SUPER_ADMIN: UserPermissions(
        dashboard=True, products=True, products_create=True, products_edit=True, products_delete=True,
        customers=True, customers_create=True, customers_edit=True,
        suppliers=True, suppliers_create=True, suppliers_edit=True,
        purchases=True, purchases_create=True, purchases_edit=True,
        invoices=True, invoices_create=True, invoices_edit=True,
        pos=True, inventory_count=True, reports=True, accounting=True, settings=True, users=True, warehouses=True
    ),
    UserRole.TENANT_ADMIN: UserPermissions(
        dashboard=True, products=True, products_create=True, products_edit=True, products_delete=True,
        customers=True, customers_create=True, customers_edit=True,
        suppliers=True, suppliers_create=True, suppliers_edit=True,
        purchases=True, purchases_create=True, purchases_edit=True,
        invoices=True, invoices_create=True, invoices_edit=True,
        pos=True, inventory_count=True, reports=True, accounting=True, settings=True, users=True, warehouses=True
    ),
    UserRole.MANAGER: UserPermissions(
        dashboard=True, products=True, products_create=True, products_edit=True, products_delete=False,
        customers=True, customers_create=True, customers_edit=True,
        suppliers=True, suppliers_create=True, suppliers_edit=True,
        purchases=True, purchases_create=True, purchases_edit=True,
        invoices=True, invoices_create=True, invoices_edit=True,
        pos=True, inventory_count=True, reports=True, accounting=False, settings=False, users=False, warehouses=True
    ),
    UserRole.ACCOUNTANT: UserPermissions(
        dashboard=True, products=True, products_create=False, products_edit=False, products_delete=False,
        customers=True, customers_create=False, customers_edit=False,
        suppliers=True, suppliers_create=False, suppliers_edit=False,
        purchases=True, purchases_create=False, purchases_edit=False,
        invoices=True, invoices_create=True, invoices_edit=True,
        pos=False, inventory_count=False, reports=True, accounting=True, settings=False, users=False, warehouses=False
    ),
    UserRole.WAREHOUSE: UserPermissions(
        dashboard=True, products=True, products_create=True, products_edit=True, products_delete=False,
        customers=False, customers_create=False, customers_edit=False,
        suppliers=True, suppliers_create=False, suppliers_edit=False,
        purchases=True, purchases_create=True, purchases_edit=True,
        invoices=False, invoices_create=False, invoices_edit=False,
        pos=False, inventory_count=True, reports=False, accounting=False, settings=False, users=False, warehouses=True
    ),
    UserRole.CASHIER: UserPermissions(
        dashboard=False, products=True, products_create=False, products_edit=False, products_delete=False,
        customers=True, customers_create=True, customers_edit=False,
        suppliers=False, suppliers_create=False, suppliers_edit=False,
        purchases=False, purchases_create=False, purchases_edit=False,
        invoices=True, invoices_create=True, invoices_edit=False,
        pos=True, inventory_count=False, reports=False, accounting=False, settings=False, users=False, warehouses=False
    ),
    UserRole.VIEWER: UserPermissions(
        dashboard=True, products=True, products_create=False, products_edit=False, products_delete=False,
        customers=True, customers_create=False, customers_edit=False,
        suppliers=True, suppliers_create=False, suppliers_edit=False,
        purchases=True, purchases_create=False, purchases_edit=False,
        invoices=True, invoices_create=False, invoices_edit=False,
        pos=False, inventory_count=False, reports=True, accounting=False, settings=False, users=False, warehouses=True
    ),
}
