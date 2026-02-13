from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class ProductUnitModel(BaseModel):
    """
    وحدة منتج واحدة - كل قطعة لها Tag خاص
    مثال: لابتوب Dell - 25 وحدة، كل وحدة لها رقم RFID مختلف
    """
    id: Optional[str] = Field(default=None, alias="_id")
    productId: str  # المنتج الأساسي
    rfidTag: str  # رقم الـ RFID الفريد لهذه الوحدة
    serialNumber: Optional[str] = None  # رقم تسلسلي إضافي
    status: str = "available"  # available, sold, reserved, damaged
    warehouseId: Optional[str] = None
    location: Optional[str] = None  # موقع في المستودع مثل: A-1-3
    notes: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    soldAt: Optional[datetime] = None
    invoiceId: Optional[str] = None  # الفاتورة إذا تم البيع

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ProductUnitCreate(BaseModel):
    productId: str
    rfidTag: str
    serialNumber: Optional[str] = None
    status: str = "available"
    warehouseId: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class ProductUnitUpdate(BaseModel):
    rfidTag: Optional[str] = None
    serialNumber: Optional[str] = None
    status: Optional[str] = None
    warehouseId: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class ProductUnitBulkCreate(BaseModel):
    """إضافة عدة وحدات دفعة واحدة"""
    productId: str
    rfidTags: List[str]  # قائمة الـ Tags
    warehouseId: Optional[str] = None
