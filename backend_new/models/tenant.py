"""
Tenant Model - Multi-Tenant SaaS Architecture
Each tenant represents a company/client using the system
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum


class SubscriptionPlan(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionType(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    PER_USER = "per_user"
    LIFETIME = "lifetime"


class TenantStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    TRIAL = "trial"


class CustomField(BaseModel):
    """Custom field definition for no-code customization"""
    fieldId: str
    fieldName: str
    fieldNameEn: str
    fieldType: str = "text"  # text, number, select, date, boolean, file
    required: bool = False
    options: Optional[List[str]] = None  # For select type
    defaultValue: Optional[Any] = None
    order: int = 0
    targetEntity: str  # products, customers, suppliers, invoices, etc.


class InvoiceTemplate(BaseModel):
    """Invoice customization settings"""
    logo: Optional[str] = None
    companyName: str = ""
    companyNameEn: str = ""
    address: str = ""
    addressEn: str = ""
    phone: str = ""
    email: str = ""
    taxNumber: str = ""
    footer: str = ""
    footerEn: str = ""
    showLogo: bool = True
    showTaxNumber: bool = True
    primaryColor: str = "#1a56db"
    secondaryColor: str = "#6b7280"


class TenantSettings(BaseModel):
    """Tenant-specific settings"""
    language: str = "ar"
    currency: str = "USD"
    currencySymbol: str = "$"
    timezone: str = "Asia/Riyadh"
    dateFormat: str = "DD/MM/YYYY"
    invoicePrefix: str = "INV"
    purchasePrefix: str = "PO"
    enableRFID: bool = True
    enableESL: bool = False
    enableOfflineMode: bool = True
    offlineModules: List[str] = ["pos", "inventory"]
    customFields: List[CustomField] = []
    invoiceTemplate: InvoiceTemplate = InvoiceTemplate()


class TenantSubscription(BaseModel):
    """Subscription details for a tenant"""
    plan: SubscriptionPlan = SubscriptionPlan.FREE
    subscriptionType: SubscriptionType = SubscriptionType.MONTHLY
    maxUsers: int = 5
    maxProducts: int = 1000
    maxWarehouses: int = 1
    startDate: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expiryDate: Optional[datetime] = None
    price: float = 0
    autoRenew: bool = False
    features: List[str] = []


class TenantBase(BaseModel):
    """Base tenant model"""
    name: str
    nameEn: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    addressEn: Optional[str] = None
    country: str = "SA"
    status: TenantStatus = TenantStatus.TRIAL
    settings: TenantSettings = TenantSettings()
    subscription: TenantSubscription = TenantSubscription()


class TenantCreate(TenantBase):
    """Model for creating a new tenant"""
    adminUsername: str
    adminPassword: str
    adminEmail: str


class TenantUpdate(BaseModel):
    """Model for updating a tenant"""
    name: Optional[str] = None
    nameEn: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    addressEn: Optional[str] = None
    status: Optional[TenantStatus] = None
    settings: Optional[TenantSettings] = None
    subscription: Optional[TenantSubscription] = None


class TenantInDB(TenantBase):
    """Tenant model as stored in database"""
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
