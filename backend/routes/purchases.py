"""
Purchases Routes - Multi-Tenant Support
"""
from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import List, Optional
from models.purchase import PurchaseModel, PurchaseCreate, PurchaseUpdate, PurchaseItem
from middleware.tenant import get_tenant_from_token
from utils.auth import require_permission
from bson import ObjectId
from datetime import datetime, timezone
import random
import string

router = APIRouter(prefix="/api/purchases", tags=["purchases"])


def generate_purchase_number():
    """Generate unique purchase number"""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.digits, k=4))
    return f"PO-{timestamp}-{random_str}"


@router.get("", response_model=List[dict])
async def get_purchases(authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("purchases"))):
    """Get all purchases for tenant"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"tenantId": tenant_id} if tenant_id else {}
    
    purchases = await db.purchases.find(query).sort("createdAt", -1).to_list(1000)
    for purchase in purchases:
        purchase['_id'] = str(purchase['_id'])
    return purchases


@router.get("/{purchase_id}", response_model=dict)
async def get_purchase(purchase_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("purchases"))):
    """Get purchase by ID"""
    from server import db
    
    if not ObjectId.is_valid(purchase_id):
        raise HTTPException(status_code=400, detail="Invalid purchase ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(purchase_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    purchase = await db.purchases.find_one(query)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    purchase['_id'] = str(purchase['_id'])
    return purchase


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_purchase(purchase: PurchaseCreate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("purchases"))):
    """Create new purchase and update inventory"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    
    # Calculate totals
    items_with_total = []
    subtotal = 0
    
    for item in purchase.items:
        item_total = item.quantity * item.unitCost
        subtotal += item_total
        items_with_total.append({
            "productId": item.productId,
            "sku": item.sku,
            "name": item.name,
            "nameEn": item.nameEn,
            "quantity": item.quantity,
            "unitCost": item.unitCost,
            "total": item_total,
            "tags": item.tags if item.tags else []
        })
    
    total = subtotal + purchase.tax - purchase.discount
    
    purchase_dict = {
        "tenantId": tenant_id,
        "purchaseNumber": generate_purchase_number(),
        "supplierId": purchase.supplierId,
        "supplierName": purchase.supplierName,
        "purchaseDate": purchase.purchaseDate or datetime.now(timezone.utc),
        "items": items_with_total,
        "subtotal": subtotal,
        "tax": purchase.tax,
        "discount": purchase.discount,
        "total": total,
        "status": "received",
        "notes": purchase.notes,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    result = await db.purchases.insert_one(purchase_dict)
    
    # Update inventory for each item
    for item in purchase.items:
        product_id = None
        
        if item.productId:
            product_id = item.productId
            await db.products.update_one(
                {"_id": ObjectId(item.productId)},
                {
                    "$inc": {"stock": item.quantity},
                    "$set": {"updatedAt": datetime.now(timezone.utc)}
                }
            )
        else:
            # Check if product exists by SKU within tenant
            sku_query = {"sku": item.sku}
            if tenant_id:
                sku_query["tenantId"] = tenant_id
            
            existing_product = await db.products.find_one(sku_query)
            if existing_product:
                product_id = str(existing_product["_id"])
                await db.products.update_one(
                    {"_id": existing_product["_id"]},
                    {
                        "$inc": {"stock": item.quantity},
                        "$set": {"updatedAt": datetime.now(timezone.utc)}
                    }
                )
            else:
                # Create new product with tenant ID
                new_product = {
                    "tenantId": tenant_id,
                    "name": item.name,
                    "nameEn": item.nameEn,
                    "sku": item.sku,
                    "barcode": None,
                    "rfidTag": None,
                    "category": "عام",
                    "categoryEn": "General",
                    "stock": item.quantity,
                    "costPrice": item.unitCost,
                    "salePrice": item.unitCost * 1.2,
                    "reorderLevel": 10,
                    "warehouseId": None,
                    "eslDeviceId": None,
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                }
                new_product_result = await db.products.insert_one(new_product)
                product_id = str(new_product_result.inserted_id)
        
        # Create product units for each tag
        if product_id and item.tags:
            for tag in item.tags:
                if tag and tag.strip():
                    unit_doc = {
                        "tenantId": tenant_id,
                        "productId": product_id,
                        "rfidTag": tag.strip(),
                        "serialNumber": tag.strip(),
                        "status": "available",
                        "createdAt": datetime.now(timezone.utc),
                        "updatedAt": datetime.now(timezone.utc)
                    }
                    await db.product_units.insert_one(unit_doc)
    
    # Update supplier balance
    if purchase.supplierId and ObjectId.is_valid(purchase.supplierId):
        await db.suppliers.update_one(
            {"_id": ObjectId(purchase.supplierId)},
            {
                "$inc": {"balance": total},
                "$set": {"updatedAt": datetime.now(timezone.utc)}
            }
        )
    
    created_purchase = await db.purchases.find_one({"_id": result.inserted_id})
    created_purchase['_id'] = str(created_purchase['_id'])
    
    return created_purchase


@router.put("/{purchase_id}", response_model=dict)
async def update_purchase(purchase_id: str, purchase: PurchaseUpdate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("purchases"))):
    """Update purchase"""
    from server import db
    
    if not ObjectId.is_valid(purchase_id):
        raise HTTPException(status_code=400, detail="Invalid purchase ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(purchase_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    existing = await db.purchases.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    update_data = {k: v for k, v in purchase.model_dump().items() if v is not None}
    update_data['updatedAt'] = datetime.now(timezone.utc)
    
    await db.purchases.update_one(query, {"$set": update_data})
    
    updated_purchase = await db.purchases.find_one({"_id": ObjectId(purchase_id)})
    updated_purchase['_id'] = str(updated_purchase['_id'])
    
    return updated_purchase


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase(purchase_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("purchases"))):
    """Delete purchase"""
    from server import db
    
    if not ObjectId.is_valid(purchase_id):
        raise HTTPException(status_code=400, detail="Invalid purchase ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(purchase_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    result = await db.purchases.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    return None
