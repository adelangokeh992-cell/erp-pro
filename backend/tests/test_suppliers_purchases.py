"""
Backend API Tests for Suppliers and Purchases modules
Tests: CRUD operations for suppliers, purchases, and inventory auto-update feature
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


class TestSuppliersAPI:
    """Suppliers CRUD API tests"""
    
    def test_get_suppliers_list(self):
        """GET /api/suppliers - should return list of suppliers"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} suppliers")
    
    def test_create_supplier_success(self):
        """POST /api/suppliers - should create new supplier"""
        supplier_data = {
            "name": "TEST_مورد اختبار",
            "nameEn": "TEST_Test Supplier",
            "phone": "0501234567",
            "email": "test_supplier@test.com",
            "address": "الرياض - السعودية"
        }
        response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "_id" in data
        assert data["name"] == supplier_data["name"]
        assert data["nameEn"] == supplier_data["nameEn"]
        assert data["phone"] == supplier_data["phone"]
        assert data["email"] == supplier_data["email"]
        assert data["address"] == supplier_data["address"]
        assert data["balance"] == 0.0
        print(f"Created supplier with ID: {data['_id']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{data['_id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == supplier_data["name"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{data['_id']}")
    
    def test_create_supplier_minimal_fields(self):
        """POST /api/suppliers - should create supplier with minimal required fields"""
        supplier_data = {
            "name": "TEST_مورد بسيط",
            "nameEn": "TEST_Simple Supplier",
            "phone": "0509876543",
            "address": "جدة"
        }
        response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["email"] is None  # Optional field
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{data['_id']}")
    
    def test_get_supplier_by_id(self):
        """GET /api/suppliers/{id} - should return specific supplier"""
        # First create a supplier
        supplier_data = {
            "name": "TEST_مورد للقراءة",
            "nameEn": "TEST_Read Supplier",
            "phone": "0501111111",
            "address": "الدمام"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        supplier_id = create_response.json()["_id"]
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == supplier_id
        assert data["name"] == supplier_data["name"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}")
    
    def test_get_supplier_invalid_id(self):
        """GET /api/suppliers/{id} - should return 400 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/suppliers/invalid-id")
        assert response.status_code == 400
    
    def test_get_supplier_not_found(self):
        """GET /api/suppliers/{id} - should return 404 for non-existent ID"""
        response = requests.get(f"{BASE_URL}/api/suppliers/507f1f77bcf86cd799439011")
        assert response.status_code == 404
    
    def test_update_supplier(self):
        """PUT /api/suppliers/{id} - should update supplier"""
        # Create supplier
        supplier_data = {
            "name": "TEST_مورد للتحديث",
            "nameEn": "TEST_Update Supplier",
            "phone": "0502222222",
            "address": "مكة"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        supplier_id = create_response.json()["_id"]
        
        # Update
        update_data = {"phone": "0503333333", "email": "updated@test.com"}
        response = requests.put(f"{BASE_URL}/api/suppliers/{supplier_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["phone"] == "0503333333"
        assert data["email"] == "updated@test.com"
        assert data["name"] == supplier_data["name"]  # Unchanged
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}")
        assert get_response.json()["phone"] == "0503333333"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}")
    
    def test_delete_supplier(self):
        """DELETE /api/suppliers/{id} - should delete supplier"""
        # Create supplier
        supplier_data = {
            "name": "TEST_مورد للحذف",
            "nameEn": "TEST_Delete Supplier",
            "phone": "0504444444",
            "address": "المدينة"
        }
        create_response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        supplier_id = create_response.json()["_id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/suppliers/{supplier_id}")
        assert response.status_code == 204
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}")
        assert get_response.status_code == 404


class TestPurchasesAPI:
    """Purchases CRUD API tests"""
    
    @pytest.fixture(autouse=True)
    def setup_supplier(self):
        """Create a test supplier for purchase tests"""
        supplier_data = {
            "name": "TEST_مورد للمشتريات",
            "nameEn": "TEST_Purchase Supplier",
            "phone": "0505555555",
            "address": "الرياض"
        }
        response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        self.supplier = response.json()
        yield
        # Cleanup supplier
        requests.delete(f"{BASE_URL}/api/suppliers/{self.supplier['_id']}")
    
    def test_get_purchases_list(self):
        """GET /api/purchases - should return list of purchases"""
        response = requests.get(f"{BASE_URL}/api/purchases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} purchases")
    
    def test_create_purchase_with_new_product(self):
        """POST /api/purchases - should create purchase and add new product to inventory"""
        unique_sku = f"TEST-SKU-{int(time.time())}"
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": unique_sku,
                    "name": "TEST_منتج جديد",
                    "nameEn": "TEST_New Product",
                    "quantity": 100,
                    "unitCost": 50.0
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": "Test purchase"
        }
        
        response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "_id" in data
        assert "purchaseNumber" in data
        assert data["purchaseNumber"].startswith("PO-")
        assert data["supplierId"] == self.supplier["_id"]
        assert data["subtotal"] == 5000.0  # 100 * 50
        assert data["total"] == 5000.0
        assert data["status"] == "received"
        assert len(data["items"]) == 1
        assert data["items"][0]["total"] == 5000.0
        
        print(f"Created purchase: {data['purchaseNumber']}")
        
        # Verify product was created in inventory
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        new_product = next((p for p in products if p["sku"] == unique_sku), None)
        assert new_product is not None, f"Product with SKU {unique_sku} should be created"
        assert new_product["stock"] == 100
        assert new_product["costPrice"] == 50.0
        print(f"Product created with stock: {new_product['stock']}")
        
        # Verify supplier balance updated
        supplier_response = requests.get(f"{BASE_URL}/api/suppliers/{self.supplier['_id']}")
        updated_supplier = supplier_response.json()
        assert updated_supplier["balance"] == 5000.0
        print(f"Supplier balance updated to: {updated_supplier['balance']}")
        
        # Cleanup - delete the created product
        requests.delete(f"{BASE_URL}/api/products/{new_product['_id']}")
    
    def test_create_purchase_with_existing_product(self):
        """POST /api/purchases - should update existing product stock"""
        # First create a product
        product_data = {
            "name": "TEST_منتج موجود",
            "nameEn": "TEST_Existing Product",
            "sku": f"TEST-EXIST-{int(time.time())}",
            "category": "اختبار",
            "categoryEn": "Test",
            "stock": 50,
            "costPrice": 100,
            "salePrice": 150,
            "reorderLevel": 10
        }
        product_response = requests.post(f"{BASE_URL}/api/products", json=product_data)
        product = product_response.json()
        initial_stock = product["stock"]
        
        # Create purchase with existing product
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": product["_id"],
                    "sku": product["sku"],
                    "name": product["name"],
                    "nameEn": product["nameEn"],
                    "quantity": 25,
                    "unitCost": 100.0
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": "Test purchase with existing product"
        }
        
        response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201
        
        # Verify stock was incremented
        updated_product_response = requests.get(f"{BASE_URL}/api/products/{product['_id']}")
        updated_product = updated_product_response.json()
        assert updated_product["stock"] == initial_stock + 25
        print(f"Stock updated from {initial_stock} to {updated_product['stock']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{product['_id']}")
    
    def test_create_purchase_multiple_items(self):
        """POST /api/purchases - should handle multiple items"""
        timestamp = int(time.time())
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-MULTI-1-{timestamp}",
                    "name": "TEST_منتج 1",
                    "nameEn": "TEST_Product 1",
                    "quantity": 10,
                    "unitCost": 100.0
                },
                {
                    "productId": None,
                    "sku": f"TEST-MULTI-2-{timestamp}",
                    "name": "TEST_منتج 2",
                    "nameEn": "TEST_Product 2",
                    "quantity": 20,
                    "unitCost": 50.0
                }
            ],
            "tax": 150,
            "discount": 100,
            "notes": "Multiple items test"
        }
        
        response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201
        
        data = response.json()
        assert len(data["items"]) == 2
        assert data["subtotal"] == 2000.0  # (10*100) + (20*50)
        assert data["tax"] == 150
        assert data["discount"] == 100
        assert data["total"] == 2050.0  # 2000 + 150 - 100
        
        # Cleanup products
        products_response = requests.get(f"{BASE_URL}/api/products")
        for p in products_response.json():
            if p["sku"].startswith(f"TEST-MULTI") and str(timestamp) in p["sku"]:
                requests.delete(f"{BASE_URL}/api/products/{p['_id']}")
    
    def test_get_purchase_by_id(self):
        """GET /api/purchases/{id} - should return specific purchase"""
        # Create a purchase
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-GET-{int(time.time())}",
                    "name": "TEST_منتج للقراءة",
                    "nameEn": "TEST_Read Product",
                    "quantity": 5,
                    "unitCost": 200.0
                }
            ],
            "tax": 0,
            "discount": 0
        }
        create_response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        purchase_id = create_response.json()["_id"]
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == purchase_id
        assert data["supplierId"] == self.supplier["_id"]
    
    def test_get_purchase_invalid_id(self):
        """GET /api/purchases/{id} - should return 400 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/purchases/invalid-id")
        assert response.status_code == 400
    
    def test_get_purchase_not_found(self):
        """GET /api/purchases/{id} - should return 404 for non-existent ID"""
        response = requests.get(f"{BASE_URL}/api/purchases/507f1f77bcf86cd799439011")
        assert response.status_code == 404
    
    def test_update_purchase_status(self):
        """PUT /api/purchases/{id} - should update purchase status"""
        # Create a purchase
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-UPDATE-{int(time.time())}",
                    "name": "TEST_منتج للتحديث",
                    "nameEn": "TEST_Update Product",
                    "quantity": 10,
                    "unitCost": 100.0
                }
            ],
            "tax": 0,
            "discount": 0
        }
        create_response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        purchase_id = create_response.json()["_id"]
        
        # Update status
        update_data = {"status": "cancelled", "notes": "Updated notes"}
        response = requests.put(f"{BASE_URL}/api/purchases/{purchase_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "cancelled"
        assert data["notes"] == "Updated notes"
    
    def test_delete_purchase(self):
        """DELETE /api/purchases/{id} - should delete purchase"""
        # Create a purchase
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-DELETE-{int(time.time())}",
                    "name": "TEST_منتج للحذف",
                    "nameEn": "TEST_Delete Product",
                    "quantity": 5,
                    "unitCost": 50.0
                }
            ],
            "tax": 0,
            "discount": 0
        }
        create_response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        purchase_id = create_response.json()["_id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert response.status_code == 204
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert get_response.status_code == 404


class TestInventoryAutoUpdate:
    """Tests for inventory auto-update feature when creating purchases"""
    
    @pytest.fixture(autouse=True)
    def setup_supplier(self):
        """Create a test supplier"""
        supplier_data = {
            "name": "TEST_مورد المخزون",
            "nameEn": "TEST_Inventory Supplier",
            "phone": "0506666666",
            "address": "الرياض"
        }
        response = requests.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
        self.supplier = response.json()
        yield
        requests.delete(f"{BASE_URL}/api/suppliers/{self.supplier['_id']}")
    
    def test_inventory_update_by_sku_match(self):
        """When product exists by SKU (no productId), stock should be incremented"""
        # Create a product first
        unique_sku = f"TEST-SKU-MATCH-{int(time.time())}"
        product_data = {
            "name": "TEST_منتج SKU",
            "nameEn": "TEST_SKU Product",
            "sku": unique_sku,
            "category": "اختبار",
            "categoryEn": "Test",
            "stock": 30,
            "costPrice": 75,
            "salePrice": 100,
            "reorderLevel": 5
        }
        product_response = requests.post(f"{BASE_URL}/api/products", json=product_data)
        product = product_response.json()
        
        # Create purchase without productId but with matching SKU
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": None,  # No productId
                    "sku": unique_sku,  # Matching SKU
                    "name": "TEST_منتج SKU",
                    "nameEn": "TEST_SKU Product",
                    "quantity": 20,
                    "unitCost": 75.0
                }
            ],
            "tax": 0,
            "discount": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201
        
        # Verify stock was incremented (not a new product created)
        updated_product_response = requests.get(f"{BASE_URL}/api/products/{product['_id']}")
        updated_product = updated_product_response.json()
        assert updated_product["stock"] == 50  # 30 + 20
        print(f"Stock updated via SKU match: 30 -> {updated_product['stock']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{product['_id']}")
    
    def test_new_product_created_with_default_markup(self):
        """When product doesn't exist, new product should be created with 20% markup"""
        unique_sku = f"TEST-NEW-MARKUP-{int(time.time())}"
        unit_cost = 100.0
        
        purchase_data = {
            "supplierId": self.supplier["_id"],
            "supplierName": self.supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": unique_sku,
                    "name": "TEST_منتج جديد مع هامش",
                    "nameEn": "TEST_New Product with Markup",
                    "quantity": 15,
                    "unitCost": unit_cost
                }
            ],
            "tax": 0,
            "discount": 0
        }
        
        response = requests.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201
        
        # Find the created product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        new_product = next((p for p in products if p["sku"] == unique_sku), None)
        
        assert new_product is not None
        assert new_product["costPrice"] == unit_cost
        assert new_product["salePrice"] == unit_cost * 1.2  # 20% markup
        assert new_product["category"] == "عام"  # Default category
        assert new_product["categoryEn"] == "General"
        print(f"New product created with sale price: {new_product['salePrice']} (20% markup)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/products/{new_product['_id']}")


# Cleanup function to remove test data
def cleanup_test_data():
    """Remove all TEST_ prefixed data"""
    # Cleanup suppliers
    suppliers = requests.get(f"{BASE_URL}/api/suppliers").json()
    for s in suppliers:
        if s.get("name", "").startswith("TEST_") or s.get("nameEn", "").startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/suppliers/{s['_id']}")
    
    # Cleanup products
    products = requests.get(f"{BASE_URL}/api/products").json()
    for p in products:
        if p.get("name", "").startswith("TEST_") or p.get("nameEn", "").startswith("TEST_") or p.get("sku", "").startswith("TEST"):
            requests.delete(f"{BASE_URL}/api/products/{p['_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
