"""
License Routes - Device-bound licensing and subscription checks
This module exposes APIs used by desktop/mobile clients to:
- Activate a license on a specific device (hardwareId)
- Check if the current device + tenant still has a valid subscription
"""

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import hashlib
import os

router = APIRouter(prefix="/api/licenses", tags=["Licenses"])


async def _optional_cron_secret(x_cron_secret: Optional[str] = Header(None)):
    """Optional header for cron/scheduler; if SUSPEND_CRON_SECRET is set, request must provide it."""
    secret = os.environ.get("SUSPEND_CRON_SECRET")
    if secret and x_cron_secret != secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing cron secret")
    return True


class ActivateLicenseRequest(BaseModel):
    """Request body for activating a license on a device"""
    tenantCode: str = Field(..., description="Unique tenant code")
    licenseKey: str = Field(..., description="License key assigned to tenant")
    hardwareId: str = Field(..., description="Client hardware identifier")
    deviceName: Optional[str] = Field(None, description="Human friendly device name")
    appVersion: Optional[str] = Field(None, description="Client application version")


class LicenseCheckRequest(BaseModel):
    """Request body for checking existing license validity"""
    tenantCode: str = Field(..., description="Unique tenant code")
    hardwareId: str = Field(..., description="Client hardware identifier")


class LicenseStatusResponse(BaseModel):
    """Standard response returned to desktop/mobile clients"""
    isValid: bool
    reason: Optional[str] = None
    tenantId: Optional[str] = None
    tenantCode: Optional[str] = None
    tenantStatus: Optional[str] = None
    plan: Optional[str] = None
    subscriptionExpiry: Optional[datetime] = None
    licenseStatus: Optional[str] = None
    maxDevices: int = 1
    activeDevices: int = 0
    remainingDevices: int = 0


def _hash_hardware_id(hardware_id: str) -> str:
    """Hash hardware ID so we never store the raw identifier"""
    return hashlib.sha256(hardware_id.encode("utf-8")).hexdigest()


async def _load_tenant_by_code(db, tenant_code: str) -> Dict[str, Any]:
    """Load tenant document from MongoDB using its unique code"""
    tenant = await db.tenants.find_one({"code": tenant_code})
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant


def _evaluate_subscription_and_status(tenant: Dict[str, Any]):
    """
    Evaluate current subscription/tenant status based on expiry date and status field.
    Returns: (now, subscription_dict, expiry, tenant_status, effective_status)
    """
    now = datetime.now(timezone.utc)
    subscription = tenant.get("subscription", {})
    expiry = subscription.get("expiryDate")
    # MongoDB may store naive datetime; make comparable with now (UTC)
    if expiry and getattr(expiry, "tzinfo", None) is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    tenant_status = tenant.get("status", "active")

    effective_status = "active"
    if expiry and expiry < now:
        effective_status = "expired"
    if tenant_status in ["suspended", "expired"]:
        effective_status = tenant_status

    return now, subscription, expiry, tenant_status, effective_status


async def _update_tenant_status_if_needed(db, tenant: Dict[str, Any], now: datetime, effective_status: str):
    """
    Persist status changes (e.g. mark tenant as expired) when subscription is no longer valid.
    """
    current_status = tenant.get("status")
    new_status = None

    if effective_status == "expired" and current_status not in ["expired", "suspended"]:
        new_status = "expired"

    if new_status:
        await db.tenants.update_one(
            {"_id": tenant["_id"]},
            {"$set": {"status": new_status, "updatedAt": now}}
        )
        tenant["status"] = new_status


@router.post("/activate", response_model=LicenseStatusResponse)
async def activate_license(payload: ActivateLicenseRequest):
    """
    Activate a license for a specific hardwareId.
    - Binds hardwareId (hashed) to tenant
    - Enforces maxDevices limit (stored under tenant.license.maxDevices, default 1)
    - Verifies subscription and tenant status
    """
    from server import db

    tenant = await _load_tenant_by_code(db, payload.tenantCode)
    now, subscription, expiry, tenant_status, effective_status = _evaluate_subscription_and_status(tenant)
    await _update_tenant_status_if_needed(db, tenant, now, effective_status)

    # If subscription is not valid, deny activation
    if effective_status in ["expired", "suspended"]:
        return LicenseStatusResponse(
            isValid=False,
            reason="Subscription expired or tenant suspended",
            tenantId=str(tenant["_id"]),
            tenantCode=tenant.get("code"),
            tenantStatus=tenant.get("status"),
            plan=subscription.get("plan"),
            subscriptionExpiry=expiry,
            licenseStatus="inactive",
        )

    # License document is stored as a sub-document on tenant
    license_info: Dict[str, Any] = tenant.get("license", {})
    stored_key = license_info.get("key")

    # If license key already exists, it must match the provided key
    if stored_key:
        if stored_key != payload.licenseKey:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid license key"
            )
    else:
        # First activation can provision the license key for this tenant
        license_info["key"] = payload.licenseKey

    max_devices = int(license_info.get("maxDevices", 1))
    devices: List[Dict[str, Any]] = license_info.get("devices", [])
    hardware_hash = _hash_hardware_id(payload.hardwareId)

    # Try to find existing device
    existing_device = None
    for device in devices:
        if device.get("hardwareIdHash") == hardware_hash:
            existing_device = device
            break

    if existing_device:
        # Refresh lastSeenAt and optional info
        existing_device["lastSeenAt"] = now
        if payload.deviceName:
            existing_device["deviceName"] = payload.deviceName
        if payload.appVersion:
            existing_device["appVersion"] = payload.appVersion
    else:
        # Enforce device limit before adding a new device
        active_devices = [d for d in devices if d.get("status", "active") == "active"]
        if len(active_devices) >= max_devices:
            return LicenseStatusResponse(
                isValid=False,
                reason="Maximum number of licensed devices reached",
                tenantId=str(tenant["_id"]),
                tenantCode=tenant.get("code"),
                tenantStatus=tenant.get("status"),
                plan=subscription.get("plan"),
                subscriptionExpiry=expiry,
                licenseStatus=license_info.get("status", "active"),
                maxDevices=max_devices,
                activeDevices=len(active_devices),
                remainingDevices=0,
            )

        new_device = {
            "hardwareIdHash": hardware_hash,
            "deviceName": payload.deviceName,
            "appVersion": payload.appVersion,
            "firstActivatedAt": now,
            "lastSeenAt": now,
            "status": "active",
        }
        devices.append(new_device)

    license_info["devices"] = devices
    if not license_info.get("status"):
        license_info["status"] = "active"

    await db.tenants.update_one(
        {"_id": tenant["_id"]},
        {
            "$set": {
                "license": license_info,
                "updatedAt": now,
            }
        }
    )

    active_devices = [d for d in devices if d.get("status", "active") == "active"]
    remaining = max(0, max_devices - len(active_devices))

    return LicenseStatusResponse(
        isValid=True,
        reason=None,
        tenantId=str(tenant["_id"]),
        tenantCode=tenant.get("code"),
        tenantStatus=tenant.get("status"),
        plan=subscription.get("plan"),
        subscriptionExpiry=expiry,
        licenseStatus=license_info.get("status", "active"),
        maxDevices=max_devices,
        activeDevices=len(active_devices),
        remainingDevices=remaining,
    )


@router.post("/check", response_model=LicenseStatusResponse)
async def check_license(payload: LicenseCheckRequest):
    """
    Check if a given hardwareId still has a valid license for the tenant.
    Does NOT automatically register new devices – only validates existing ones.
    """
    from server import db

    tenant = await _load_tenant_by_code(db, payload.tenantCode)
    now, subscription, expiry, tenant_status, effective_status = _evaluate_subscription_and_status(tenant)
    await _update_tenant_status_if_needed(db, tenant, now, effective_status)

    license_info: Dict[str, Any] = tenant.get("license", {})
    max_devices = int(license_info.get("maxDevices", 1))
    devices: List[Dict[str, Any]] = license_info.get("devices", [])
    hardware_hash = _hash_hardware_id(payload.hardwareId)

    existing_device = None
    for device in devices:
        if device.get("hardwareIdHash") == hardware_hash:
            existing_device = device
            break

    active_devices = [d for d in devices if d.get("status", "active") == "active"]
    remaining = max(0, max_devices - len(active_devices))

    base_info = dict(
        tenantId=str(tenant["_id"]),
        tenantCode=tenant.get("code"),
        tenantStatus=tenant.get("status"),
        plan=subscription.get("plan"),
        subscriptionExpiry=expiry,
        licenseStatus=license_info.get("status", "active"),
        maxDevices=max_devices,
        activeDevices=len(active_devices),
        remainingDevices=remaining,
    )

    if effective_status in ["expired", "suspended"]:
        return LicenseStatusResponse(
            isValid=False,
            reason="Subscription expired or tenant suspended",
            **base_info,
        )

    if not existing_device:
        return LicenseStatusResponse(
            isValid=False,
            reason="Device not registered for this license",
            **base_info,
        )

    if existing_device.get("status", "active") != "active":
        return LicenseStatusResponse(
            isValid=False,
            reason="Device is blocked for this license",
            **base_info,
        )

    # Touch lastSeenAt on successful check
    existing_device["lastSeenAt"] = now
    await db.tenants.update_one(
        {"_id": tenant["_id"]},
        {
            "$set": {
                "license.devices": devices,
                "updatedAt": now,
            }
        }
    )

    return LicenseStatusResponse(
        isValid=True,
        reason=None,
        **base_info,
    )


async def run_suspend_expired(db) -> tuple[int, datetime]:
    """
    Core auto-suspend logic: mark all tenants with expired subscription as expired.
    Returns (suspended_count, now). Used by the HTTP endpoint and by the server background task.
    """
    now = datetime.now(timezone.utc)
    suspended_count = 0
    cursor = db.tenants.find({})
    async for tenant in cursor:
        _, _, _, _, effective_status = _evaluate_subscription_and_status(tenant)
        if effective_status == "expired" and tenant.get("status") not in ["expired", "suspended"]:
            await _update_tenant_status_if_needed(db, tenant, now, effective_status)
            suspended_count += 1
    return suspended_count, now


@router.post("/suspend-expired")
async def suspend_expired_tenants(_: bool = Depends(_optional_cron_secret)):
    """
    Run auto-suspend: mark all tenants with expired subscription as expired.
    Call this from a cron job or Windows Task Scheduler (e.g. daily).
    Optional: set SUSPEND_CRON_SECRET in env and pass it as header X-Cron-Secret.
    """
    from server import db

    suspended_count, now = await run_suspend_expired(db)
    return {"suspendedCount": suspended_count, "message": "Auto-suspend completed", "serverTime": now.isoformat()}

