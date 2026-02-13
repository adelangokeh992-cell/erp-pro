"""
Tenant Middleware - Extract tenant info from JWT token
"""
from fastapi import HTTPException, status, Header
from typing import Optional
from jose import jwt, JWTError
import os

SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-change-in-production-123")
ALGORITHM = "HS256"


def get_tenant_from_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extract tenant ID from JWT token in Authorization header.
    Returns None for super_admin or if no token provided.
    """
    if not authorization:
        return None
    
    try:
        # Remove 'Bearer ' prefix if present
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tenant_id = payload.get("tenantId")
        return tenant_id
    except JWTError:
        return None


def require_tenant(authorization: Optional[str] = Header(None)) -> str:
    """
    Require a valid tenant ID from the token.
    Raises 403 if no tenant ID found (except for super_admin).
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Super admin can access without tenant
        if payload.get("role") == "super_admin":
            return None  # Will return all data
        
        tenant_id = payload.get("tenantId")
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant access required"
            )
        return tenant_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def get_user_info(authorization: Optional[str] = Header(None)) -> dict:
    """
    Get full user info from token.
    """
    if not authorization:
        return {}
    
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "userId": payload.get("userId"),
            "username": payload.get("username"),
            "role": payload.get("role"),
            "tenantId": payload.get("tenantId")
        }
    except JWTError:
        return {}
