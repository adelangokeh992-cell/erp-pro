from pydantic import BaseModel, ConfigDict, Field, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema
from typing import Optional, Any
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

class ESLDeviceModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    deviceId: str
    productId: Optional[str] = None
    status: str = "offline"  # "online", "offline"
    battery: int = 100
    lastUpdate: datetime = Field(default_factory=datetime.utcnow)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(validate_by_name=True, arbitrary_types_allowed=True)

class ESLDeviceCreate(BaseModel):
    deviceId: str
    productId: Optional[str] = None
    status: str = "offline"
    battery: int = 100

class ESLDeviceUpdate(BaseModel):
    productId: Optional[str] = None
    status: Optional[str] = None
    battery: Optional[int] = None

class SettingModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    key: str
    value: str
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(validate_by_name=True, arbitrary_types_allowed=True)
