from pydantic import BaseModel, ConfigDict, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
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

class ProductModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    nameEn: str
    sku: str
    barcode: Optional[str] = None
    rfidTag: Optional[str] = None
    category: str
    categoryEn: str
    stock: int = 0
    costPrice: float
    salePrice: float
    reorderLevel: int = 10
    warehouseId: Optional[str] = None
    eslDeviceId: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(validate_by_name=True, arbitrary_types_allowed=True)

class ProductCreate(BaseModel):
    name: str
    nameEn: str
    sku: str
    barcode: Optional[str] = None
    rfidTag: Optional[str] = None
    category: str
    categoryEn: str
    stock: int = 0
    costPrice: float
    salePrice: float
    reorderLevel: int = 10
    warehouseId: Optional[str] = None
    eslDeviceId: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    nameEn: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    rfidTag: Optional[str] = None
    category: Optional[str] = None
    categoryEn: Optional[str] = None
    stock: Optional[int] = None
    costPrice: Optional[float] = None
    salePrice: Optional[float] = None
    reorderLevel: Optional[int] = None
    warehouseId: Optional[str] = None
    eslDeviceId: Optional[str] = None
