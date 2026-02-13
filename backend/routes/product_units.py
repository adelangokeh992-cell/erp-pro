from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from models.product_unit import ProductUnitCreate, ProductUnitUpdate, ProductUnitBulkCreate
from utils.auth import require_permission
from middleware.tenant import get_tenant_from_token

router = APIRouter(prefix="/api")


def _base_query(tenant_id: Optional[str]) -> dict:
    return {"tenantId": tenant_id} if tenant_id else {}


def serialize_unit(unit):
    if unit:
        unit["_id"] = str(unit["_id"])
    return unit


@router.get("/product-units")
async def get_all_units(
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    warehouse_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """جلب جميع الوحدات مع فلترة اختيارية"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    query = {**base}
    if product_id:
        query["productId"] = product_id
    if status:
        query["status"] = status
    if warehouse_id:
        query["warehouseId"] = warehouse_id

    units = await db.product_units.find(query).to_list(1000)
    return [serialize_unit(u) for u in units]


@router.get("/product-units/{unit_id}")
async def get_unit(
    unit_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """جلب وحدة واحدة"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    unit = await db.product_units.find_one({"_id": ObjectId(unit_id), **base})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return serialize_unit(unit)


@router.get("/product-units/rfid/{rfid_tag}")
async def get_unit_by_rfid(
    rfid_tag: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """جلب وحدة بواسطة RFID Tag"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    unit = await db.product_units.find_one({"rfidTag": rfid_tag, **base})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    product = await db.products.find_one({"_id": ObjectId(unit["productId"]), **base})
    if product:
        product["_id"] = str(product["_id"])
        unit["product"] = product

    return serialize_unit(unit)


@router.post("/product-units")
async def create_unit(
    unit: ProductUnitCreate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """إنشاء وحدة جديدة"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    existing = await db.product_units.find_one({"rfidTag": unit.rfidTag, **base})
    if existing:
        raise HTTPException(status_code=400, detail="RFID Tag already exists")

    product = await db.products.find_one({"_id": ObjectId(unit.productId), **base})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    unit_data = unit.dict()
    unit_data["tenantId"] = tenant_id
    unit_data["createdAt"] = datetime.utcnow()
    unit_data["updatedAt"] = datetime.utcnow()

    result = await db.product_units.insert_one(unit_data)

    await db.products.update_one(
        {"_id": ObjectId(unit.productId), **base},
        {"$inc": {"stock": 1}}
    )

    unit_data["_id"] = str(result.inserted_id)
    return unit_data


@router.post("/product-units/bulk")
async def create_units_bulk(
    data: ProductUnitBulkCreate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """إنشاء عدة وحدات دفعة واحدة"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    product = await db.products.find_one({"_id": ObjectId(data.productId), **base})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    created = []
    skipped = []

    for tag in data.rfidTags:
        existing = await db.product_units.find_one({"rfidTag": tag, **base})
        if existing:
            skipped.append(tag)
            continue

        unit_data = {
            "tenantId": tenant_id,
            "productId": data.productId,
            "rfidTag": tag,
            "status": "available",
            "warehouseId": data.warehouseId,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        result = await db.product_units.insert_one(unit_data)
        unit_data["_id"] = str(result.inserted_id)
        created.append(unit_data)

    if created:
        await db.products.update_one(
            {"_id": ObjectId(data.productId), **base},
            {"$inc": {"stock": len(created)}}
        )

    return {
        "created": len(created),
        "skipped": len(skipped),
        "skippedTags": skipped,
        "units": created
    }


@router.put("/product-units/{unit_id}")
async def update_unit(
    unit_id: str,
    unit: ProductUnitUpdate,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """تحديث وحدة"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    query = {"_id": ObjectId(unit_id), **base}

    update_data = {k: v for k, v in unit.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    if "rfidTag" in update_data:
        existing = await db.product_units.find_one({
            "rfidTag": update_data["rfidTag"],
            "_id": {"$ne": ObjectId(unit_id)},
            **base
        })
        if existing:
            raise HTTPException(status_code=400, detail="RFID Tag already exists")

    update_data["updatedAt"] = datetime.utcnow()

    result = await db.product_units.update_one(query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")

    updated = await db.product_units.find_one({"_id": ObjectId(unit_id)})
    return serialize_unit(updated)


@router.delete("/product-units/{unit_id}")
async def delete_unit(
    unit_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """حذف وحدة"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    unit = await db.product_units.find_one({"_id": ObjectId(unit_id), **base})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    await db.product_units.delete_one({"_id": ObjectId(unit_id), **base})

    await db.products.update_one(
        {"_id": ObjectId(unit["productId"]), **base},
        {"$inc": {"stock": -1}}
    )

    return {"message": "Unit deleted"}


@router.post("/product-units/{unit_id}/sell")
async def sell_unit(
    unit_id: str,
    invoice_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """تسجيل بيع وحدة"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    result = await db.product_units.update_one(
        {"_id": ObjectId(unit_id), "status": "available", **base},
        {
            "$set": {
                "status": "sold",
                "soldAt": datetime.utcnow(),
                "invoiceId": invoice_id,
                "updatedAt": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Unit not available or not found")

    unit = await db.product_units.find_one({"_id": ObjectId(unit_id)})

    await db.products.update_one(
        {"_id": ObjectId(unit["productId"]), **base},
        {"$inc": {"stock": -1}}
    )

    return serialize_unit(unit)


@router.get("/product-units/product/{product_id}/count")
async def get_product_units_count(
    product_id: str,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("products"))
):
    """إحصائيات وحدات منتج معين"""
    from server import db
    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    pipeline = [
        {"$match": {"productId": product_id, **base}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]

    results = await db.product_units.aggregate(pipeline).to_list(10)
    
    counts = {
        "available": 0,
        "sold": 0,
        "reserved": 0,
        "damaged": 0,
        "total": 0
    }
    
    for r in results:
        counts[r["_id"]] = r["count"]
        counts["total"] += r["count"]
    
    return counts
