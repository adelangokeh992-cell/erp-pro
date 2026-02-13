from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str
    tenantCode: Optional[str] = None

class UserInDB(BaseModel):
    username: str
    name: str
    nameEn: str
    email: str
    role: str
    permissions: List[str] = []
    hashed_password: str
    isActive: bool = True
