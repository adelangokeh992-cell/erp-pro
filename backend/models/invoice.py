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

class InvoiceItem(BaseModel):
    productId: Optional[str] = None
    productName: str
    quantity: int
    price: float
    total: float

class InvoiceModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    invoiceNumber: str
    customerId: str
    customerName: str
    date: datetime
    dueDate: datetime
    items: List[InvoiceItem]
    subtotal: float
    tax: float
    discount: float = 0.0
    total: float
    status: str = "unpaid"  # "paid", "unpaid", "partial"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(validate_by_name=True, arbitrary_types_allowed=True)

class InvoiceCreate(BaseModel):
    customerId: Optional[str] = None
    customerName: str
    date: Optional[datetime] = None
    dueDate: Optional[datetime] = None
    items: List[InvoiceItem]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float
    status: str = "unpaid"
    paymentMethod: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    total: Optional[float] = None
