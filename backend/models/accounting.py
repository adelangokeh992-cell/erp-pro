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

# Expense Model
class ExpenseModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    category: str  # rent, utilities, salaries, supplies, other
    description: str
    amount: float
    date: datetime
    paymentMethod: str = "cash"
    reference: Optional[str] = None
    notes: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: float
    date: Optional[datetime] = None
    paymentMethod: str = "cash"
    reference: Optional[str] = None
    notes: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[datetime] = None
    paymentMethod: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None

# Account Model (for Chart of Accounts)
class AccountModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    code: str  # e.g., "1001", "2001"
    name: str
    nameEn: str
    type: str  # asset, liability, equity, revenue, expense
    balance: float = 0.0
    parentId: Optional[str] = None
    isActive: bool = True
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class AccountCreate(BaseModel):
    code: str
    name: str
    nameEn: str
    type: str
    balance: float = 0.0
    parentId: Optional[str] = None

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    nameEn: Optional[str] = None
    balance: Optional[float] = None
    isActive: Optional[bool] = None

# Journal Entry Model
class JournalEntryLine(BaseModel):
    accountId: str
    accountName: str
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None

class JournalEntryModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    entryNumber: str
    date: datetime
    description: str
    lines: List[JournalEntryLine]
    reference: Optional[str] = None
    status: str = "posted"  # draft, posted, cancelled
    createdBy: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class JournalEntryCreate(BaseModel):
    date: Optional[datetime] = None
    description: str
    lines: List[JournalEntryLine]
    reference: Optional[str] = None
