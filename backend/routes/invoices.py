"""
Invoices Routes - Multi-Tenant Support
"""
from fastapi import APIRouter, HTTPException, status, Header, Depends
from typing import List, Optional
from models.invoice import InvoiceModel, InvoiceCreate, InvoiceUpdate
from middleware.tenant import get_tenant_from_token
from utils.auth import require_permission
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("", response_model=List[dict])
async def get_invoices(authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("invoices"))):
    """Get all invoices for tenant"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"tenantId": tenant_id} if tenant_id else {}
    
    invoices = await db.invoices.find(query).sort("createdAt", -1).to_list(1000)
    for invoice in invoices:
        invoice['_id'] = str(invoice['_id'])
    return invoices


@router.get("/{invoice_id}", response_model=dict)
async def get_invoice(invoice_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("invoices"))):
    """Get invoice by ID"""
    from server import db
    
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(invoice_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    invoice = await db.invoices.find_one(query)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice['_id'] = str(invoice['_id'])
    return invoice


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_invoice(invoice: InvoiceCreate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("invoices"))):
    """Create new invoice"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    
    # Generate invoice number per tenant
    count_query = {"tenantId": tenant_id} if tenant_id else {}
    count = await db.invoices.count_documents(count_query)
    invoice_number = f"INV-{str(count + 1).zfill(4)}"
    
    invoice_dict = invoice.model_dump()
    invoice_dict['tenantId'] = tenant_id
    invoice_dict['invoiceNumber'] = invoice_number
    
    now = datetime.now(timezone.utc)
    if not invoice_dict.get('date'):
        invoice_dict['date'] = now
    if not invoice_dict.get('dueDate'):
        invoice_dict['dueDate'] = now
    
    invoice_dict['createdAt'] = now
    invoice_dict['updatedAt'] = now
    
    # Update customer balance
    if invoice_dict.get('customerId') and invoice_dict['customerId'] and invoice_dict['status'] != 'paid':
        try:
            if ObjectId.is_valid(invoice_dict['customerId']):
                await db.customers.update_one(
                    {"_id": ObjectId(invoice_dict['customerId'])},
                    {"$inc": {"balance": -invoice_dict['total']}}
                )
        except:
            pass
    
    # Update product stock
    for item in invoice_dict['items']:
        if item.get('productId') and ObjectId.is_valid(item['productId']):
            await db.products.update_one(
                {"_id": ObjectId(item['productId'])},
                {"$inc": {"stock": -item['quantity']}}
            )
    
    result = await db.invoices.insert_one(invoice_dict)
    created_invoice = await db.invoices.find_one({"_id": result.inserted_id})
    created_invoice['_id'] = str(created_invoice['_id'])
    
    return created_invoice


@router.put("/{invoice_id}", response_model=dict)
async def update_invoice(invoice_id: str, invoice: InvoiceUpdate, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("invoices"))):
    """Update invoice"""
    from server import db
    
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(invoice_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    existing = await db.invoices.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {k: v for k, v in invoice.model_dump().items() if v is not None}
    update_data['updatedAt'] = datetime.now(timezone.utc)
    
    await db.invoices.update_one(query, {"$set": update_data})
    
    updated_invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    updated_invoice['_id'] = str(updated_invoice['_id'])
    
    return updated_invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: str, authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("invoices"))):
    """Delete invoice"""
    from server import db
    
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    tenant_id = get_tenant_from_token(authorization)
    query = {"_id": ObjectId(invoice_id)}
    if tenant_id:
        query["tenantId"] = tenant_id
    
    result = await db.invoices.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return None
