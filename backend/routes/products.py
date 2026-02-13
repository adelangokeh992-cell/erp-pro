"""
Products Routes - Multi-Tenant Support
"""
from fastapi import APIRouter, HTTPException, status, Header, Query, Depends
from typing import List, Optional
from models.product import ProductModel, ProductCreate, ProductUpdate
from middleware.tenant import get_tenant_from_token
from utils.auth import require_permission
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/products", tags=["products"])


def build_tenant_query(tenant_id: Optional[str]) -> dict:
    """Build query filter based on tenant"""
    if tenant_id:
        return {"tenantId": tenant_id}
    return {}  # Super admin sees all


@router.get("", response_model=List[dict])
async def get_products(
    authorization: Optional[str] = Header(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    _: dict = Depends(require_permission("products")),
):
    """Get products for tenant with optional pagination (skip, limit)"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = build_tenant_query(tenant_id)
    
    cursor = db.products.find(query).skip(skip).limit(limit)
    products = await cursor.to_list(limit)
    for product in products:
        product['_id'] = str(product['_id'])
    return products


@router.get("/search/low-stock", response_model=List[dict])
async def get_low_stock_products(authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("products"))):
    """Get products with low stock"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = build_tenant_query(tenant_id)
    query["$expr"] = {"$lte": ["$stock", "$reorderLevel"]}
    
    products = await db.products.find(query).to_list(1000)
    for product in products:
        product['_id'] = str(product['_id'])
    return products


@router.get("/{product_id}", response_model=dict)
async def get_product(product_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("products"))):
    """Get product by ID"""
    from server import db
    
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(product_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    product = await db.products.find_one(query)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product['_id'] = str(product['_id'])
    return product


@router.get("/rfid/{tag}", response_model=dict)
async def get_product_by_rfid(tag: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("products"))):
    """Get product by RFID tag"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"rfidTag": tag}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    product = await db.products.find_one(query)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product['_id'] = str(product['_id'])
    return product


@router.get("/barcode/{code}", response_model=dict)
async def get_product_by_barcode(code: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("products"))):
    """Get product by barcode"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"barcode": code}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    product = await db.products.find_one(query)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product['_id'] = str(product['_id'])
    return product


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_product(product: ProductCreate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("products"))):
    """Create new product"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    
    # Check for duplicate SKU within tenant
    sku_query = {"sku": product.sku}
    if tenant_id:
        sku_query["tenantId"] = tenant_id
    
    existing = await db.products.find_one(sku_query)
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    product_dict = product.model_dump()
    product_dict["tenantId"] = tenant_id  # Add tenant ID
    product_dict["createdAt"] = datetime.now(timezone.utc)
    product_dict["updatedAt"] = datetime.now(timezone.utc)
    
    result = await db.products.insert_one(product_dict)
    
    created_product = await db.products.find_one({"_id": result.inserted_id})
    created_product['_id'] = str(created_product['_id'])
    
    return created_product


@router.put("/{product_id}", response_model=dict)
async def update_product(product_id: str, product: ProductUpdate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("products"))):
    """Update product"""
    from server import db
    
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(product_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    existing = await db.products.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc)
    
    await db.products.update_one(query, {"$set": update_data})
    
    updated_product = await db.products.find_one({"_id": ObjectId(product_id)})
    updated_product['_id'] = str(updated_product['_id'])
    
    return updated_product


@router.delete("/{product_id}")
async def delete_product(product_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("products"))):
    """Delete product"""
    from server import db
    
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(product_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    result = await db.products.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted successfully"}
