"""
Seed demo data for one month: demo tenant, customers, products, suppliers, purchases, sales (invoices).
Run from backend directory: python scripts/seed_demo_data.py
Uses existing DB (MONGO_URL, DB_NAME). Creates tenant code DEMO if not exists.
Login after seed: tenant code DEMO, username demo, password Demo@123
"""
import asyncio
import random
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Run from backend directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.chdir(Path(__file__).resolve().parent.parent)

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from bson import ObjectId

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "erp_local")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

DEMO_TENANT_CODE = "DEMO"
DEMO_ADMIN_USER = "demo"
DEMO_ADMIN_PASS = "Demo@123"

# ----- عملاء وهميون -----
CUSTOMERS = [
    {"name": "أحمد محمد", "nameEn": "Ahmed Mohammed", "phone": "0912345678", "email": "ahmed@example.com", "address": "دمشق، المزة"},
    {"name": "شركة التقنية المتقدمة", "nameEn": "Advanced Tech Co", "phone": "0945678901", "email": "info@advtech.sy", "address": "حلب، الشهباء"},
    {"name": "فاطمة علي", "nameEn": "Fatima Ali", "phone": "0956789012", "email": "fatima@mail.com", "address": "حمص، باب العمود"},
    {"name": "مكتبة المعرفة", "nameEn": "Knowledge Library", "phone": "0967890123", "email": "lib@knowledge.sy", "address": "دمشق، أبو رمانة"},
    {"name": "خالد حسن", "nameEn": "Khaled Hassan", "phone": "0978901234", "email": "khaled@example.com", "address": "حماة، السوق"},
    {"name": "محل الإلكترونيات", "nameEn": "Electronics Store", "phone": "0989012345", "email": "store@elec.sy", "address": "دمشق، الصالحية"},
    {"name": "سارة محمود", "nameEn": "Sara Mahmoud", "phone": "0990123456", "email": "sara@mail.com", "address": "طرطوس، المركز"},
    {"name": "شركة البناء الحديث", "nameEn": "Modern Build Co", "phone": "0911223344", "email": "build@modern.sy", "address": "دمشق، كفر سوسة"},
    {"name": "عمر يوسف", "nameEn": "Omar Youssef", "phone": "0922334455", "email": "omar@example.com", "address": "حلب، العزيزية"},
    {"name": "مكتب المحاماة", "nameEn": "Law Office", "phone": "0933445566", "email": "law@office.sy", "address": "دمشق، المالكي"},
]

# ----- منتجات وهمية -----
PRODUCTS = [
    {"name": "لابتوب Dell XPS 15", "nameEn": "Dell XPS 15 Laptop", "sku": "DEMO-DELL-01", "category": "إلكترونيات", "categoryEn": "Electronics", "costPrice": 4500, "salePrice": 5500, "reorderLevel": 10},
    {"name": "هاتف iPhone 15 Pro", "nameEn": "iPhone 15 Pro", "sku": "DEMO-IP15-01", "category": "إلكترونيات", "categoryEn": "Electronics", "costPrice": 5000, "salePrice": 6000, "reorderLevel": 15},
    {"name": "شاشة Samsung 32 بوصة", "nameEn": "Samsung 32 Monitor", "sku": "DEMO-SAM-01", "category": "إلكترونيات", "categoryEn": "Electronics", "costPrice": 800, "salePrice": 1000, "reorderLevel": 20},
    {"name": "لوحة مفاتيح ميكانيكية", "nameEn": "Mechanical Keyboard", "sku": "DEMO-KEY-01", "category": "ملحقات", "categoryEn": "Accessories", "costPrice": 150, "salePrice": 200, "reorderLevel": 30},
    {"name": "ماوس لاسلكي", "nameEn": "Wireless Mouse", "sku": "DEMO-MOU-01", "category": "ملحقات", "categoryEn": "Accessories", "costPrice": 50, "salePrice": 75, "reorderLevel": 50},
    {"name": "سماعات رأس", "nameEn": "Headphones", "sku": "DEMO-HP-01", "category": "ملحقات", "categoryEn": "Accessories", "costPrice": 80, "salePrice": 120, "reorderLevel": 25},
    {"name": "كابل USB-C", "nameEn": "USB-C Cable", "sku": "DEMO-CAB-01", "category": "ملحقات", "categoryEn": "Accessories", "costPrice": 15, "salePrice": 25, "reorderLevel": 100},
    {"name": "حافظة هاتف", "nameEn": "Phone Case", "sku": "DEMO-CAS-01", "category": "ملحقات", "categoryEn": "Accessories", "costPrice": 20, "salePrice": 35, "reorderLevel": 80},
]

# ----- موردون وهميون -----
SUPPLIERS = [
    {"name": "مؤسسة الإلكترونيات الشرقية", "nameEn": "East Electronics", "phone": "0112345678", "email": "supply@east.sy", "address": "دمشق"},
    {"name": "شركة المستلزمات التقنية", "nameEn": "Tech Supplies Co", "phone": "0123456789", "email": "info@techsupp.sy", "address": "حلب"},
    {"name": "مورد الملحقات العالمية", "nameEn": "Global Accessories", "phone": "0134567890", "email": "sales@globalacc.sy", "address": "دمشق"},
]


def random_date_in_last_month() -> datetime:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=30)
    delta = (now - start).total_seconds()
    return start + timedelta(seconds=random.uniform(0, delta))


async def run():
    now = datetime.now(timezone.utc)

    # 1) إنشاء شركة تجريبية ومستخدم أدمن
    tenant = await db.tenants.find_one({"code": DEMO_TENANT_CODE})
    if not tenant:
        trial_end = now + timedelta(days=30)
        tenant_doc = {
            "code": DEMO_TENANT_CODE,
            "name": "شركة تجريبية",
            "nameEn": "Demo Company",
            "email": "demo@demo.sy",
            "phone": "0900000000",
            "address": "عنوان تجريبي",
            "addressEn": "Demo Address",
            "country": "SY",
            "status": "active",
            "settings": {"language": "ar", "currency": "USD", "currencySymbol": "$", "timezone": "Asia/Damascus"},
            "subscription": {
                "plan": "trial",
                "subscriptionType": "monthly",
                "maxUsers": 10,
                "maxProducts": 5000,
                "startDate": now,
                "expiryDate": trial_end,
            },
            "createdAt": now,
            "updatedAt": now,
        }
        r = await db.tenants.insert_one(tenant_doc)
        tenant_id = str(r.inserted_id)
        print(f"Created demo tenant: {DEMO_TENANT_CODE} ({tenant_id})")

        admin_user = {
            "username": DEMO_ADMIN_USER,
            "email": "demo@demo.sy",
            "fullName": "مدير التجريبي",
            "fullNameEn": "Demo Admin",
            "role": "tenant_admin",
            "status": "active",
            "permissions": {
                "dashboard": True, "products": True, "products_create": True, "products_edit": True, "products_delete": True,
                "customers": True, "customers_create": True, "customers_edit": True,
                "suppliers": True, "suppliers_create": True, "suppliers_edit": True,
                "purchases": True, "purchases_create": True, "purchases_edit": True,
                "invoices": True, "invoices_create": True, "invoices_edit": True,
                "pos": True, "inventory_count": True, "reports": True, "accounting": True, "settings": True, "users": True, "warehouses": True
            },
            "tenantId": tenant_id,
            "passwordHash": pwd_context.hash(DEMO_ADMIN_PASS),
            "createdAt": now,
            "updatedAt": now,
        }
        await db.users.insert_one(admin_user)
        print(f"Created demo user: {DEMO_ADMIN_USER} / {DEMO_ADMIN_PASS}")
    else:
        tenant_id = str(tenant["_id"])
        print(f"Demo tenant already exists: {DEMO_TENANT_CODE}")
        # التأكد من وجود مستخدم التجربة وكلمة المرور الصحيحة (للتجربة: Demo@123)
        existing_demo_user = await db.users.find_one({"username": DEMO_ADMIN_USER, "tenantId": tenant_id})
        demo_user_update = {
            "email": "demo@demo.sy",
            "fullName": "مدير التجريبي",
            "fullNameEn": "Demo Admin",
            "role": "tenant_admin",
            "status": "active",
            "tenantId": tenant_id,
            "passwordHash": pwd_context.hash(DEMO_ADMIN_PASS),
            "updatedAt": now,
        }
        if existing_demo_user:
            await db.users.update_one(
                {"_id": existing_demo_user["_id"]},
                {"$set": demo_user_update}
            )
            print(f"Updated demo user password: {DEMO_ADMIN_USER} / {DEMO_ADMIN_PASS}")
        else:
            admin_user = {
                "username": DEMO_ADMIN_USER,
                "permissions": {
                    "dashboard": True, "products": True, "products_create": True, "products_edit": True, "products_delete": True,
                    "customers": True, "customers_create": True, "customers_edit": True,
                    "suppliers": True, "suppliers_create": True, "suppliers_edit": True,
                    "purchases": True, "purchases_create": True, "purchases_edit": True,
                    "invoices": True, "invoices_create": True, "invoices_edit": True,
                    "pos": True, "inventory_count": True, "reports": True, "accounting": True, "settings": True, "users": True, "warehouses": True
                },
                "createdAt": now,
                **demo_user_update,
            }
            await db.users.insert_one(admin_user)
            print(f"Created demo user: {DEMO_ADMIN_USER} / {DEMO_ADMIN_PASS}")

    base = {"tenantId": tenant_id}

    # 2) عملاء
    existing_customers = await db.customers.count_documents(base)
    if existing_customers == 0:
        for c in CUSTOMERS:
            c["tenantId"] = tenant_id
            c["balance"] = 0
            c["type"] = "company" if "شركة" in c["name"] or "Co" in c["nameEn"] else "individual"
            c["createdAt"] = now
            c["updatedAt"] = now
        await db.customers.insert_many(CUSTOMERS)
        print(f"Inserted {len(CUSTOMERS)} customers")
    else:
        print(f"Customers already exist: {existing_customers}")

    # 3) موردون
    existing_suppliers = await db.suppliers.count_documents(base)
    if existing_suppliers == 0:
        for s in SUPPLIERS:
            s["tenantId"] = tenant_id
            s["balance"] = 0
            s["createdAt"] = now
            s["updatedAt"] = now
        await db.suppliers.insert_many(SUPPLIERS)
        print(f"Inserted {len(SUPPLIERS)} suppliers")
    else:
        print(f"Suppliers already exist: {existing_suppliers}")

    # 4) منتجات (مخزون ابتدائي عالي)
    existing_products = await db.products.count_documents(base)
    if existing_products == 0:
        for p in PRODUCTS:
            p["tenantId"] = tenant_id
            p["stock"] = 200
            p["barcode"] = p.get("barcode") or ("BC-" + p["sku"])
            p["warehouseId"] = None
            p["eslDeviceId"] = None
            p["createdAt"] = now
            p["updatedAt"] = now
        await db.products.insert_many(PRODUCTS)
        print(f"Inserted {len(PRODUCTS)} products")
    else:
        print(f"Products already exist: {existing_products}")

    # جلب القوائم للاستخدام
    customer_ids = await db.customers.find(base).project({"_id": 1, "name": 1, "nameEn": 1}).to_list(100)
    supplier_ids = await db.suppliers.find(base).project({"_id": 1, "name": 1, "nameEn": 1}).to_list(100)
    product_list = await db.products.find(base).to_list(100)

    if not product_list or not customer_ids or not supplier_ids:
        print("Missing customers, suppliers or products. Exit.")
        return

    # 5) مشتريات موزعة على الشهر الماضي
    existing_purchases = await db.purchases.count_documents(base)
    if existing_purchases == 0:
        for i in range(25):
            supp = random.choice(supplier_ids)
            purchase_date = random_date_in_last_month()
            items = []
            subtotal = 0
            for _ in range(random.randint(1, 4)):
                prod = random.choice(product_list)
                qty = random.randint(5, 30)
                cost = prod["costPrice"]
                total_line = qty * cost
                items.append({
                    "productId": str(prod["_id"]),
                    "sku": prod["sku"],
                    "name": prod["name"],
                    "nameEn": prod["nameEn"],
                    "quantity": qty,
                    "unitCost": cost,
                    "total": total_line,
                })
                subtotal += total_line
            tax = round(subtotal * 0.1, 2)
            total = subtotal + tax
            po = {
                "tenantId": tenant_id,
                "purchaseNumber": f"PO-{purchase_date.strftime('%Y%m%d')}-{i+1:04d}",
                "supplierId": str(supp["_id"]),
                "supplierName": supp["name"],
                "purchaseDate": purchase_date,
                "items": items,
                "subtotal": subtotal,
                "tax": tax,
                "discount": 0,
                "total": total,
                "status": "received",
                "notes": "",
                "createdAt": purchase_date,
                "updatedAt": purchase_date,
            }
            await db.purchases.insert_one(po)
            for it in items:
                await db.products.update_one(
                    {"_id": ObjectId(it["productId"]), **base},
                    {"$inc": {"stock": it["quantity"]}, "$set": {"updatedAt": now}}
                )
        print("Inserted 25 purchases (last 30 days)")
    else:
        print(f"Purchases already exist: {existing_purchases}")

    # 6) فواتير مبيعات موزعة على الشهر الماضي
    existing_invoices = await db.invoices.count_documents(base)
    if existing_invoices == 0:
        inv_num = 1
        for i in range(40):
            cust = random.choice(customer_ids)
            inv_date = random_date_in_last_month()
            due = inv_date + timedelta(days=14)
            items = []
            subtotal = 0
            for _ in range(random.randint(1, 5)):
                prod = random.choice(product_list)
                qty = random.randint(1, 5)
                price = prod["salePrice"]
                total_line = qty * price
                items.append({
                    "productId": str(prod["_id"]),
                    "productName": prod["name"],
                    "quantity": qty,
                    "price": price,
                    "total": total_line,
                })
                subtotal += total_line
            tax = round(subtotal * 0.05, 2)
            discount = 0
            total = subtotal + tax - discount
            status = random.choice(["paid", "paid", "paid", "unpaid"])
            inv = {
                "tenantId": tenant_id,
                "invoiceNumber": f"INV-{str(inv_num).zfill(4)}",
                "customerId": str(cust["_id"]),
                "customerName": cust["name"],
                "date": inv_date,
                "dueDate": due,
                "items": items,
                "subtotal": subtotal,
                "tax": tax,
                "discount": discount,
                "total": total,
                "status": status,
                "createdAt": inv_date,
                "updatedAt": inv_date,
            }
            await db.invoices.insert_one(inv)
            for it in items:
                await db.products.update_one(
                    {"_id": ObjectId(it["productId"]), **base},
                    {"$inc": {"stock": -it["quantity"]}, "$set": {"updatedAt": now}}
                )
            if status != "paid" and cust.get("_id"):
                await db.customers.update_one(
                    {"_id": cust["_id"]},
                    {"$inc": {"balance": -total}}
                )
            inv_num += 1
        print("Inserted 40 sales invoices (last 30 days)")
    else:
        print(f"Invoices already exist: {existing_invoices}")

    # إعدادات افتراضية للشركة التجريبية
    settings_count = await db.settings.count_documents({"tenantId": tenant_id})
    if settings_count == 0:
        await db.settings.insert_many([
            {"key": "exchangeRate", "value": "15000", "tenantId": tenant_id, "updatedAt": now},
            {"key": "operationMode", "value": "local", "tenantId": tenant_id, "updatedAt": now},
            {"key": "currency", "value": "USD", "tenantId": tenant_id, "updatedAt": now},
        ])
        print("Inserted default settings for demo tenant")

    print("\nDone. Login with: tenant code = DEMO, username = demo, password = Demo@123")
    client.close()


if __name__ == "__main__":
    asyncio.run(run())
