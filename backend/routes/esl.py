from fastapi import APIRouter, HTTPException, status, Depends, Header
from typing import List, Optional
from models.esl import ESLDeviceModel, ESLDeviceCreate, ESLDeviceUpdate, SettingModel
from utils.auth import require_permission
from middleware.tenant import get_tenant_from_token
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/esl", tags=["esl"])


def _base_query(tenant_id: Optional[str]) -> dict:
    return {"tenantId": tenant_id} if tenant_id else {}


@router.get("/devices", response_model=List[dict])
async def get_esl_devices(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Get all ESL devices"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    devices = await db.esl_devices.find(base).to_list(1000)
    for device in devices:
        device['_id'] = str(device['_id'])
    return devices


@router.get("/devices/{device_id}", response_model=dict)
async def get_esl_device(
    device_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Get ESL device by deviceId"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    device = await db.esl_devices.find_one({"deviceId": device_id, **base})
    if not device:
        raise HTTPException(status_code=404, detail="ESL device not found")

    device['_id'] = str(device['_id'])
    return device


@router.post("/devices", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_esl_device(
    device: ESLDeviceCreate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Register new ESL device"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    existing = await db.esl_devices.find_one({"deviceId": device.deviceId, **base})
    if existing:
        raise HTTPException(status_code=400, detail="Device ID already exists")

    device_dict = device.dict()
    device_dict['tenantId'] = tenant_id
    device_dict['createdAt'] = datetime.utcnow()
    device_dict['updatedAt'] = datetime.utcnow()
    device_dict['lastUpdate'] = datetime.utcnow()

    result = await db.esl_devices.insert_one(device_dict)
    created_device = await db.esl_devices.find_one({"_id": result.inserted_id})
    created_device['_id'] = str(created_device['_id'])

    return created_device


@router.put("/devices/{device_id}", response_model=dict)
async def update_esl_device(
    device_id: str,
    device: ESLDeviceUpdate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Update ESL device"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    query = {"deviceId": device_id, **base}

    update_data = {k: v for k, v in device.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    update_data['updatedAt'] = datetime.utcnow()
    update_data['lastUpdate'] = datetime.utcnow()

    result = await db.esl_devices.update_one(query, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="ESL device not found")

    updated_device = await db.esl_devices.find_one({"deviceId": device_id})
    updated_device['_id'] = str(updated_device['_id'])

    return updated_device


@router.post("/devices/{device_id}/update-price", response_model=dict)
async def update_device_price(
    device_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Update price on ESL device"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    device = await db.esl_devices.find_one({"deviceId": device_id, **base})
    if not device:
        raise HTTPException(status_code=404, detail="ESL device not found")

    if device.get('status') != 'online':
        raise HTTPException(status_code=400, detail="Device is offline")

    await db.esl_devices.update_one(
        {"deviceId": device_id, **base},
        {"$set": {"lastUpdate": datetime.utcnow()}}
    )

    updated_device = await db.esl_devices.find_one({"deviceId": device_id})
    updated_device['_id'] = str(updated_device['_id'])

    return {"message": "Price updated successfully", "device": updated_device}


@router.post("/update-all")
async def update_all_devices(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Update all online ESL devices for current tenant"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    result = await db.esl_devices.update_many(
        {"status": "online", **base},
        {"$set": {"lastUpdate": datetime.utcnow()}}
    )

    return {
        "message": f"Updated {result.modified_count} devices",
        "count": result.modified_count
    }


@router.get("/settings", response_model=List[dict])
async def get_settings(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Get all settings for current tenant"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    settings = await db.settings.find(base).to_list(1000)
    for setting in settings:
        setting['_id'] = str(setting['_id'])
    return settings


@router.get("/settings/{key}", response_model=dict)
async def get_setting(
    key: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Get setting by key"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    setting = await db.settings.find_one({"key": key, **base})
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")

    setting['_id'] = str(setting['_id'])
    return setting


@router.put("/settings/{key}", response_model=dict)
async def update_setting(
    key: str,
    value: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    from server import db
    """Update or create setting for current tenant"""
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    result = await db.settings.update_one(
        {"key": key, **base},
        {"$set": {"value": value, "updatedAt": datetime.utcnow(), "tenantId": tenant_id}},
        upsert=True
    )

    updated_setting = await db.settings.find_one({"key": key, **base})
    updated_setting['_id'] = str(updated_setting['_id'])

    return updated_setting
