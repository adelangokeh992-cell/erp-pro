from pydantic import BaseModel, Field
from pydantic_core import core_schema
from typing import Optional, List, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ])
        ], serialization=core_schema.plain_serializer_function_ser_schema(
            lambda x: str(x)
        ))

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

class PurchaseItem(BaseModel):
    productId: Optional[str] = None
    sku: str
    name: str
    nameEn: str
    quantity: int
    unitCost: float
    total: float

class PurchaseItemCreate(BaseModel):
    productId: Optional[str] = None
    sku: str
    name: str
    nameEn: str
    quantity: int
    unitCost: float
    rfidTag: Optional[str] = None
    tags: Optional[List[str]] = None

class PurchaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    purchaseNumber: str
    supplierId: str
    supplierName: str
    purchaseDate: datetime
    items: List[PurchaseItem]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float
    status: str = "pending"  # pending, received, cancelled
    notes: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PurchaseCreate(BaseModel):
    supplierId: str
    supplierName: str
    purchaseDate: Optional[datetime] = None
    items: List[PurchaseItemCreate]
    tax: float = 0.0
    discount: float = 0.0
    notes: Optional[str] = None

class PurchaseUpdate(BaseModel):
    status: Optional[str] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
