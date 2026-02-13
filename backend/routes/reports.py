from fastapi import APIRouter, Query, Depends, Header
from datetime import datetime, timezone, timedelta
from typing import Optional
from utils.auth import require_permission
from middleware.tenant import get_tenant_from_token

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _base_query(tenant_id: Optional[str]) -> dict:
    """Query filter by tenant; empty for super_admin."""
    return {"tenantId": tenant_id} if tenant_id else {}


@router.get("/sales")
async def get_sales_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: str = Query(default="month", regex="^(day|week|month|year)$"),
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("reports"))
):
    """Get sales report"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    now = datetime.now(timezone.utc)

    # Parse dates or use defaults
    if start_date:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    else:
        if period == "day":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start = now - timedelta(days=7)
        elif period == "year":
            start = now - timedelta(days=365)
        else:  # month
            start = now - timedelta(days=30)

    if end_date:
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    else:
        end = now

    # Get invoices in period (tenant-scoped)
    invoices = await db.invoices.find({
        **base,
        "createdAt": {"$gte": start, "$lte": end}
    }).to_list(10000)
    
    total_sales = sum(inv.get('total', 0) for inv in invoices)
    total_orders = len(invoices)
    total_items = sum(len(inv.get('items', [])) for inv in invoices)
    
    # Sales by status
    paid = sum(1 for inv in invoices if inv.get('status') == 'paid')
    unpaid = sum(1 for inv in invoices if inv.get('status') == 'unpaid')
    
    # Product breakdown
    product_sales = {}
    for inv in invoices:
        for item in inv.get('items', []):
            pname = item.get('productName', 'Unknown')
            if pname not in product_sales:
                product_sales[pname] = {'quantity': 0, 'revenue': 0}
            product_sales[pname]['quantity'] += item.get('quantity', 0)
            product_sales[pname]['revenue'] += item.get('total', 0)
    
    top_products = sorted(
        [{'name': k, **v} for k, v in product_sales.items()],
        key=lambda x: x['revenue'],
        reverse=True
    )[:20]
    
    # Daily breakdown
    daily_data = {}
    for inv in invoices:
        day = inv.get('createdAt', now).strftime('%Y-%m-%d')
        if day not in daily_data:
            daily_data[day] = {'sales': 0, 'orders': 0}
        daily_data[day]['sales'] += inv.get('total', 0)
        daily_data[day]['orders'] += 1
    
    daily_breakdown = [{'date': k, **v} for k, v in sorted(daily_data.items())]
    
    # Format invoices for response
    for inv in invoices:
        inv['_id'] = str(inv['_id'])
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "totalSales": total_sales,
            "totalOrders": total_orders,
            "totalItems": total_items,
            "averageOrderValue": total_sales / total_orders if total_orders > 0 else 0,
            "paidOrders": paid,
            "unpaidOrders": unpaid
        },
        "topProducts": top_products,
        "dailyBreakdown": daily_breakdown,
        "invoices": invoices[-50:]  # Last 50 invoices
    }

@router.get("/inventory")
async def get_inventory_report(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("reports"))
):
    """Get inventory report"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    products = await db.products.find(base).to_list(10000)
    
    total_products = len(products)
    total_stock = sum(p.get('stock', 0) for p in products)
    total_value = sum(p.get('stock', 0) * p.get('costPrice', 0) for p in products)
    total_retail = sum(p.get('stock', 0) * p.get('salePrice', 0) for p in products)
    
    low_stock = [p for p in products if p.get('stock', 0) <= p.get('reorderLevel', 10) and p.get('stock', 0) > 0]
    out_of_stock = [p for p in products if p.get('stock', 0) <= 0]
    healthy_stock = [p for p in products if p.get('stock', 0) > p.get('reorderLevel', 10)]
    
    # By category
    categories = {}
    for p in products:
        cat = p.get('category', 'عام')
        if cat not in categories:
            categories[cat] = {'count': 0, 'stock': 0, 'value': 0}
        categories[cat]['count'] += 1
        categories[cat]['stock'] += p.get('stock', 0)
        categories[cat]['value'] += p.get('stock', 0) * p.get('costPrice', 0)
    
    category_breakdown = [{'category': k, **v} for k, v in categories.items()]
    
    # Format products
    for p in products:
        p['_id'] = str(p['_id'])
    for p in low_stock:
        p['_id'] = str(p['_id'])
    for p in out_of_stock:
        p['_id'] = str(p['_id'])
    
    return {
        "summary": {
            "totalProducts": total_products,
            "totalStock": total_stock,
            "totalValue": total_value,
            "totalRetailValue": total_retail,
            "potentialProfit": total_retail - total_value
        },
        "stockStatus": {
            "healthy": len(healthy_stock),
            "lowStock": len(low_stock),
            "outOfStock": len(out_of_stock)
        },
        "categoryBreakdown": category_breakdown,
        "lowStockItems": low_stock,
        "outOfStockItems": out_of_stock,
        "allProducts": products
    }

@router.get("/purchases")
async def get_purchases_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("reports"))
):
    """Get purchases report"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else now - timedelta(days=30)
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else now

    purchases = await db.purchases.find({
        **base,
        "createdAt": {"$gte": start, "$lte": end}
    }).to_list(10000)
    
    total_purchases = sum(p.get('total', 0) for p in purchases)
    total_orders = len(purchases)
    
    # By supplier
    supplier_data = {}
    for p in purchases:
        supplier = p.get('supplierName', 'Unknown')
        if supplier not in supplier_data:
            supplier_data[supplier] = {'orders': 0, 'total': 0}
        supplier_data[supplier]['orders'] += 1
        supplier_data[supplier]['total'] += p.get('total', 0)
    
    by_supplier = sorted(
        [{'supplier': k, **v} for k, v in supplier_data.items()],
        key=lambda x: x['total'],
        reverse=True
    )
    
    # Format purchases
    for p in purchases:
        p['_id'] = str(p['_id'])
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "summary": {
            "totalPurchases": total_purchases,
            "totalOrders": total_orders,
            "averageOrderValue": total_purchases / total_orders if total_orders > 0 else 0
        },
        "bySupplier": by_supplier,
        "purchases": purchases
    }

@router.get("/profit")
async def get_profit_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("reports"))
):
    """Get profit report"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)

    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else now - timedelta(days=30)
    end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else now

    # Get sales (tenant-scoped)
    invoices = await db.invoices.find({
        **base,
        "createdAt": {"$gte": start, "$lte": end}
    }).to_list(10000)
    total_sales = sum(inv.get('total', 0) for inv in invoices)

    # Get purchases (tenant-scoped)
    purchases = await db.purchases.find({
        **base,
        "createdAt": {"$gte": start, "$lte": end}
    }).to_list(10000)
    total_purchases = sum(p.get('total', 0) for p in purchases)

    # Get expenses (tenant-scoped)
    expense_query = {**base, "date": {"$gte": start, "$lte": end}}
    colls = await db.list_collection_names()
    expenses = await db.expenses.find(expense_query).to_list(10000) if colls and 'expenses' in colls else []
    total_expenses = sum(e.get('amount', 0) for e in expenses)
    
    gross_profit = total_sales - total_purchases
    net_profit = gross_profit - total_expenses
    
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "revenue": total_sales,
        "costOfGoods": total_purchases,
        "grossProfit": gross_profit,
        "expenses": total_expenses,
        "netProfit": net_profit,
        "profitMargin": (gross_profit / total_sales * 100) if total_sales > 0 else 0
    }


@router.get("/analytics")
async def get_analytics_report(
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("reports"))
):
    """تحليلات متقدمة: مقارنة الفترات + اتجاه المبيعات الشهري (آخر 12 شهر)"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    now = datetime.now(timezone.utc)

    # الشهر الحالي والماضي
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 1:
        prev_month_start = month_start.replace(year=month_start.year - 1, month=12)
    else:
        prev_month_start = month_start.replace(month=month_start.month - 1)
    next_month = month_start + timedelta(days=32)
    current_month_end = next_month.replace(day=1) - timedelta(seconds=1)
    prev_month_end = month_start - timedelta(seconds=1)

    # مبيعات الشهر الحالي
    current_invoices = await db.invoices.find({
        **base,
        "createdAt": {"$gte": month_start, "$lte": current_month_end}
    }).to_list(10000)
    current_sales = sum(inv.get("total", 0) for inv in current_invoices)
    current_orders = len(current_invoices)

    # مبيعات الشهر الماضي
    prev_invoices = await db.invoices.find({
        **base,
        "createdAt": {"$gte": prev_month_start, "$lte": prev_month_end}
    }).to_list(10000)
    prev_sales = sum(inv.get("total", 0) for inv in prev_invoices)
    prev_orders = len(prev_invoices)

    # نسب النمو
    sales_growth = ((current_sales - prev_sales) / prev_sales * 100) if prev_sales else (100 if current_sales else 0)
    orders_growth = ((current_orders - prev_orders) / prev_orders * 100) if prev_orders else (100 if current_orders else 0)

    # اتجاه شهري لآخر 12 شهر
    monthly_trend = []
    for i in range(11, -1, -1):
        # أول يوم من الشهر (i أشهر قبل الشهر الحالي)
        y, m = month_start.year, month_start.month
        m -= i
        while m < 1:
            m += 12
            y -= 1
        start_m = datetime(y, m, 1, 0, 0, 0, 0, timezone.utc)
        if m == 12:
            end_m = datetime(y + 1, 1, 1, 0, 0, 0, 0, timezone.utc) - timedelta(seconds=1)
        else:
            end_m = datetime(y, m + 1, 1, 0, 0, 0, 0, timezone.utc) - timedelta(seconds=1)
        invs = await db.invoices.find({
            **base,
            "createdAt": {"$gte": start_m, "$lte": end_m}
        }).to_list(5000)
        total = sum(inv.get("total", 0) for inv in invs)
        monthly_trend.append({
            "month": start_m.strftime("%Y-%m"),
            "label": start_m.strftime("%b %Y"),
            "sales": total,
            "orders": len(invs),
        })

    return {
        "currentMonth": {
            "sales": current_sales,
            "orders": current_orders,
            "label": month_start.strftime("%b %Y"),
        },
        "previousMonth": {
            "sales": prev_sales,
            "orders": prev_orders,
            "label": prev_month_start.strftime("%b %Y"),
        },
        "growth": {
            "salesPercent": round(sales_growth, 1),
            "ordersPercent": round(orders_growth, 1),
        },
        "monthlyTrend": monthly_trend,
    }


@router.get("/customers")
async def get_customers_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    authorization: Optional[str] = Header(None),
    _: dict = Depends(require_permission("reports"))
):
    """تقرير العملاء: أفضل العملاء حسب الإيراد وعدد الطلبات"""
    from server import db

    tenant_id = get_tenant_from_token(authorization)
    base = _base_query(tenant_id)
    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else now - timedelta(days=365)
    end = datetime.fromisoformat(end_date.replace("Z", "+00:00")) if end_date else now

    invoices = await db.invoices.find({
        **base,
        "createdAt": {"$gte": start, "$lte": end},
    }).to_list(10000)

    # تجميع حسب العميل
    customer_ids = set()
    for inv in invoices:
        cid = inv.get("customerId")
        if cid:
            customer_ids.add(cid)
    customers_map = {}
    if customer_ids:
        from bson import ObjectId
        ids = [ObjectId(x) for x in customer_ids if ObjectId.is_valid(x)]
        if ids:
            cursor = db.customers.find({"_id": {"$in": ids}, **base})
            async for c in cursor:
                customers_map[str(c["_id"])] = c.get("name") or c.get("nameEn") or str(c["_id"])

    by_customer = {}
    for inv in invoices:
        cid = inv.get("customerId") or "unknown"
        cid_str = str(cid) if cid != "unknown" else "unknown"
        name = customers_map.get(cid_str) if cid_str != "unknown" else None
        key = cid_str if cid_str != "unknown" else "unknown"
        if key not in by_customer:
            by_customer[key] = {"customerId": cid_str, "customerName": name or "Unknown", "totalRevenue": 0, "orderCount": 0}
        by_customer[key]["totalRevenue"] += inv.get("total", 0)
        by_customer[key]["orderCount"] += 1

    # ترتيب حسب الإيراد
    top = sorted(by_customer.values(), key=lambda x: x["totalRevenue"], reverse=True)[:limit]
    for c in top:
        c["averageOrderValue"] = round(c["totalRevenue"] / c["orderCount"], 2) if c["orderCount"] else 0

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "topCustomers": top,
    }
