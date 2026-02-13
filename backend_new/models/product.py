"""
Product Model - Multi-Tenant Product Management
Each product belongs to a tenant with support for custom fields
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone


class ProductBase(BaseModel):
    """Base product model"""
    tenantId: str
    name: str
    nameEn: Optional[str] = None
    sku: str
    barcode: Optional[str] = None
    rfidTag: Optional[str] = None
    category: Optional[str] = None
    categoryEn: Optional[str] = None
    description: Optional[str] = None
    descriptionEn: Optional[str] = None
    stock: int = 0
    costPrice: float = 0
    salePrice: float = 0
    reorderLevel: int = 10
    warehouseId: Optional[str] = None
    eslDeviceId: Optional[str] = None
    imageUrl: Optional[str] = None
    isActive: bool = True
    # Custom fields storage - dynamic fields defined by tenant
    customFields: Dict[str, Any] = {}


class ProductCreate(ProductBase):
    """Model for creating a new product"""
    pass


class ProductUpdate(BaseModel):
    """Model for updating a product"""
    name: Optional[str] = None
    nameEn: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    rfidTag: Optional[str] = None
    category: Optional[str] = None
    categoryEn: Optional[str] = None
    description: Optional[str] = None
    descriptionEn: Optional[str] = None
    stock: Optional[int] = None
    costPrice: Optional[float] = None
    salePrice: Optional[float] = None
    reorderLevel: Optional[int] = None
    warehouseId: Optional[str] = None
    eslDeviceId: Optional[str] = None
    imageUrl: Optional[str] = None
    isActive: Optional[bool] = None
    customFields: Optional[Dict[str, Any]] = None


class ProductInDB(ProductBase):
    """Product model as stored in database"""
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True


class ProductUnit(BaseModel):
    """Individual product unit with unique RFID tag"""
    tenantId: str
    productId: str
    rfidTag: str
    serialNumber: Optional[str] = None
    status: str = "available"  # available, sold, damaged, lost
    purchaseId: Optional[str] = None
    invoiceId: Optional[str] = None
    customFields: Dict[str, Any] = {}


class ProductUnitCreate(ProductUnit):
    """Model for creating a new product unit"""
    pass


class ProductUnitInDB(ProductUnit):
    """Product unit model as stored in database"""
    id: str = Field(alias="_id")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
