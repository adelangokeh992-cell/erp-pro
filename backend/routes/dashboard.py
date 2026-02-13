"""
Dashboard Routes - Multi-Tenant Support
"""
from fastapi import APIRouter, Header, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
from middleware.tenant import get_tenant_from_token
from utils.auth import require_permission

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("dashboard"))):
    """Get dashboard statistics for tenant"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    base_query = {"tenantId": tenant_id} if tenant_id else {}
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Get counts
    total_products = await db.products.count_documents(base_query)
    total_customers = await db.customers.count_documents(base_query)
    total_suppliers = await db.suppliers.count_documents(base_query)
    
    users_query = {"tenantId": tenant_id} if tenant_id else {}
    total_users = await db.users.count_documents(users_query)
    total_warehouses = await db.warehouses.count_documents(base_query)
    
    # Get low stock products
    low_stock_query = {**base_query, "$expr": {"$lte": ["$stock", "$reorderLevel"]}}
    low_stock = await db.products.find(low_stock_query).to_list(100)
    for p in low_stock:
        p['_id'] = str(p['_id'])
    
    # Get out of stock products
    out_of_stock_query = {**base_query, "stock": {"$lte": 0}}
    out_of_stock = await db.products.count_documents(out_of_stock_query)
    
    # Get today's sales
    today_query = {**base_query, "createdAt": {"$gte": today_start}}
    today_invoices = await db.invoices.find(today_query).to_list(1000)
    today_sales = sum(inv.get('total', 0) for inv in today_invoices)
    today_orders = len(today_invoices)
    
    # Get weekly sales
    week_query = {**base_query, "createdAt": {"$gte": week_start}}
    week_invoices = await db.invoices.find(week_query).to_list(1000)
    week_sales = sum(inv.get('total', 0) for inv in week_invoices)
    
    # Get monthly sales
    month_query = {**base_query, "createdAt": {"$gte": month_start}}
    month_invoices = await db.invoices.find(month_query).to_list(1000)
    month_sales = sum(inv.get('total', 0) for inv in month_invoices)
    
    # Get today's purchases
    today_purchases = await db.purchases.find(today_query).to_list(1000)
    today_purchase_total = sum(p.get('total', 0) for p in today_purchases)
    
    # Get weekly purchases
    week_purchases = await db.purchases.find(week_query).to_list(1000)
    week_purchase_total = sum(p.get('total', 0) for p in week_purchases)
    
    # Get total inventory value
    all_products = await db.products.find(base_query).to_list(10000)
    inventory_value = sum(p.get('stock', 0) * p.get('costPrice', 0) for p in all_products)
    inventory_retail_value = sum(p.get('stock', 0) * p.get('salePrice', 0) for p in all_products)
    
    # Get recent invoices
    recent_invoices = await db.invoices.find(base_query).sort("createdAt", -1).limit(5).to_list(5)
    for inv in recent_invoices:
        inv['_id'] = str(inv['_id'])
    
    # Get top selling products
    all_invoices = await db.invoices.find(base_query).to_list(10000)
    product_sales = {}
    for inv in all_invoices:
        for item in inv.get('items', []):
            pid = item.get('productId') or item.get('productName', 'unknown')
            pname = item.get('productName', 'Unknown')
            if pid not in product_sales:
                product_sales[pid] = {'name': pname, 'quantity': 0, 'revenue': 0}
            product_sales[pid]['quantity'] += item.get('quantity', 0)
            product_sales[pid]['revenue'] += item.get('total', 0)
    
    top_products = sorted(product_sales.values(), key=lambda x: x['revenue'], reverse=True)[:5]
    
    # Daily sales for chart (last 7 days)
    daily_sales = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        day_query = {**base_query, "createdAt": {"$gte": day, "$lt": next_day}}
        day_invoices = await db.invoices.find(day_query).to_list(1000)
        day_total = sum(inv.get('total', 0) for inv in day_invoices)
        daily_sales.append({
            'date': day.strftime('%Y-%m-%d'),
            'dayName': day.strftime('%A'),
            'sales': day_total,
            'orders': len(day_invoices)
        })
    
    return {
        "counts": {
            "products": total_products,
            "customers": total_customers,
            "suppliers": total_suppliers,
            "users": total_users,
            "warehouses": total_warehouses
        },
        "inventory": {
            "lowStock": len(low_stock),
            "outOfStock": out_of_stock,
            "lowStockItems": low_stock[:10],
            "totalValue": inventory_value,
            "retailValue": inventory_retail_value
        },
        "sales": {
            "today": today_sales,
            "todayOrders": today_orders,
            "weekly": week_sales,
            "monthly": month_sales
        },
        "purchases": {
            "today": today_purchase_total,
            "weekly": week_purchase_total
        },
        "recentInvoices": recent_invoices,
        "topProducts": top_products,
        "dailySales": daily_sales
    }


@router.get("/alerts")
async def get_alerts(authorization: Optional[str] = Header(None), _: dict = Depends(require_permission("dashboard"))):
    """Get system alerts for tenant"""
    from server import db
    
    tenant_id = get_tenant_from_token(authorization)
    base_query = {"tenantId": tenant_id} if tenant_id else {}
    
    alerts = []
    
    # Low stock alerts
    low_stock_query = {**base_query, "$expr": {"$lte": ["$stock", "$reorderLevel"]}, "stock": {"$gt": 0}}
    low_stock = await db.products.find(low_stock_query).to_list(100)
    for p in low_stock:
        alerts.append({
            "type": "warning",
            "category": "inventory",
            "title": f"مخزون منخفض: {p.get('name')}",
            "titleEn": f"Low Stock: {p.get('nameEn')}",
            "message": f"الكمية المتبقية: {p.get('stock')} (الحد الأدنى: {p.get('reorderLevel')})",
            "messageEn": f"Remaining: {p.get('stock')} (Min: {p.get('reorderLevel')})"
        })
    
    # Out of stock alerts
    out_of_stock_query = {**base_query, "stock": {"$lte": 0}}
    out_of_stock = await db.products.find(out_of_stock_query).to_list(100)
    for p in out_of_stock:
        alerts.append({
            "type": "critical",
            "category": "inventory",
            "title": f"نفاد المخزون: {p.get('name')}",
            "titleEn": f"Out of Stock: {p.get('nameEn')}",
            "message": "يجب إعادة الطلب فوراً",
            "messageEn": "Reorder immediately"
        })
    
    # Unpaid invoices alerts
    unpaid_query = {**base_query, "status": "unpaid"}
    unpaid = await db.invoices.find(unpaid_query).to_list(100)
    if len(unpaid) > 0:
        total_unpaid = sum(inv.get('total', 0) for inv in unpaid)
        alerts.append({
            "type": "info",
            "category": "finance",
            "title": f"فواتير غير مدفوعة: {len(unpaid)}",
            "titleEn": f"Unpaid Invoices: {len(unpaid)}",
            "message": f"المبلغ الإجمالي: ${total_unpaid:,.2f}",
            "messageEn": f"Total Amount: ${total_unpaid:,.2f}"
        })
    
    return {"alerts": alerts}
