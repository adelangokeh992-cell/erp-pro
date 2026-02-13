from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from pydantic import BaseModel
from models.user import UserModel, UserCreate, UserUpdate
from bson import ObjectId
from datetime import datetime, timezone
from utils.auth import require_permission, require_tenant, get_current_user, get_password_hash
from utils.password_policy import validate_password, validate_password_en
from utils.audit import log_audit
from utils.rbac import get_permissions_for_role

router = APIRouter(prefix="/api/users", tags=["users"])


class PushTokenBody(BaseModel):
    expoPushToken: str


@router.post("/me/push-token")
async def register_push_token(
    body: PushTokenBody,
    current_user: dict = Depends(get_current_user),
):
    """Register Expo Push token for the current user (mobile app)."""
    from server import db
    user_id = current_user.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    tenant_id = current_user.get("tenantId")
    token = (body.expoPushToken or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="expoPushToken required")
    await db.push_tokens.update_one(
        {"userId": user_id, "expoPushToken": token},
        {
            "$set": {
                "userId": user_id,
                "tenantId": tenant_id,
                "expoPushToken": token,
                "updatedAt": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    return {"ok": True, "message": "Token registered"}


@router.get("", response_model=List[dict])
async def get_users(
    tenant_id: str = Depends(require_tenant),
    current_user: dict = Depends(require_permission("users")),
):
    """Get all users (filtered by tenant for non-super-admin)"""
    from server import db
    query = {"tenantId": tenant_id} if tenant_id else {}
    users = await db.users.find(query).to_list(1000)
    for user in users:
        user['_id'] = str(user['_id'])
    return users

@router.get("/{user_id}", response_model=dict)
async def get_user(user_id: str, current_user: dict = Depends(require_permission("users"))):
    """Get user by ID"""
    from server import db
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user['_id'] = str(user['_id'])
    return user

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    tenant_id: str = Depends(require_tenant),
    current_user: dict = Depends(require_permission("users")),
):
    """Create new user. Permissions are set from role preset (RBAC)."""
    from server import db

    # Check if username already exists
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    if not user.password:
        raise HTTPException(status_code=400, detail="Password is required")

    valid, err = validate_password(user.password)
    if not valid:
        valid_en, err_en = validate_password_en(user.password)
        raise HTTPException(status_code=400, detail=err_en if not valid_en else err)

    user_dict = user.model_dump(exclude={"password"})
    # Map name/nameEn to fullName/fullNameEn for consistency with auth
    user_dict["fullName"] = user_dict.get("name", "")
    user_dict["fullNameEn"] = user_dict.get("nameEn", "")
    user_dict["passwordHash"] = get_password_hash(user.password)
    user_dict["tenantId"] = tenant_id
    user_dict["createdAt"] = datetime.now(timezone.utc)
    user_dict["updatedAt"] = datetime.now(timezone.utc)
    # Apply role-based permissions (override with explicit permissions if provided)
    user_dict["permissions"] = user_dict.get("permissions") if isinstance(user_dict.get("permissions"), dict) else get_permissions_for_role(user_dict.get("role", "worker"))
    
    result = await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    created_user['_id'] = str(created_user['_id'])
    await log_audit(db, current_user.get("userId", ""), "create", "user", created_user["_id"], {"username": user.username})
    return created_user

@router.put("/{user_id}", response_model=dict)
async def update_user(user_id: str, user: UserUpdate, current_user: dict = Depends(require_permission("users"))):
    """Update user. If role is changed, permissions are updated from role preset unless permissions are explicitly provided."""
    from server import db
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    update_data = {k: v for k, v in user.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    if "role" in update_data and "permissions" not in update_data:
        update_data["permissions"] = get_permissions_for_role(update_data["role"])
    if "name" in update_data:
        update_data["fullName"] = update_data["name"]
    if "nameEn" in update_data:
        update_data["fullNameEn"] = update_data["nameEn"]
    update_data["updatedAt"] = datetime.now(timezone.utc)
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    updated_user['_id'] = str(updated_user['_id'])
    await log_audit(db, current_user.get("userId", ""), "update", "user", user_id, {})
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, current_user: dict = Depends(require_permission("users"))):
    """Delete user"""
    from server import db
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_audit(db, current_user.get("userId", ""), "delete", "user", user_id, {})
    return None
