"""
Backend API tests for Purchases functionality
Tests:
- Create purchases with multiple items
- Edit purchases (status, tax, discount, notes)
- Create new product from within purchase flow
- Add multiple items to same purchase
"""

import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def generate_unique_id():
    """Generate unique identifier for test data"""
    return ''.join(random.choices(string.digits, k=10))

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def test_supplier(api_client):
    """Create a test supplier for purchase tests"""
    unique_id = generate_unique_id()
    supplier_data = {
        "name": f"TEST_مورد_{unique_id}",
        "nameEn": f"TEST_Supplier_{unique_id}",
        "phone": "0912345678",
        "email": f"test_{unique_id}@supplier.com",
        "address": "Test Address",
        "balance": 0
    }
    response = api_client.post(f"{BASE_URL}/api/suppliers", json=supplier_data)
    assert response.status_code == 201, f"Failed to create test supplier: {response.text}"
    supplier = response.json()
    yield supplier
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/suppliers/{supplier['_id']}")
    except:
        pass

@pytest.fixture
def test_product(api_client):
    """Create a test product for purchase tests"""
    unique_id = generate_unique_id()
    product_data = {
        "name": f"TEST_منتج_{unique_id}",
        "nameEn": f"TEST_Product_{unique_id}",
        "sku": f"TEST-SKU-{unique_id}",
        "category": "اختبار",
        "categoryEn": "Test",
        "costPrice": 100,
        "salePrice": 150,
        "stock": 50,
        "reorderLevel": 10
    }
    response = api_client.post(f"{BASE_URL}/api/products", json=product_data)
    assert response.status_code == 201, f"Failed to create test product: {response.text}"
    product = response.json()
    yield product
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/products/{product['_id']}")
    except:
        pass


class TestPurchasesAPI:
    """Tests for Purchases API endpoints"""

    def test_get_all_purchases(self, api_client):
        """Test GET /api/purchases returns list"""
        response = api_client.get(f"{BASE_URL}/api/purchases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/purchases: Found {len(data)} purchases")

    def test_create_purchase_with_single_item(self, api_client, test_supplier, test_product):
        """Test creating a purchase with one item"""
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": test_product["_id"],
                    "sku": test_product["sku"],
                    "name": test_product["name"],
                    "nameEn": test_product["nameEn"],
                    "quantity": 10,
                    "unitCost": 100
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": "Test purchase - single item"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201, f"Failed to create purchase: {response.text}"
        
        created = response.json()
        assert "purchaseNumber" in created
        assert created["supplierId"] == test_supplier["_id"]
        assert len(created["items"]) == 1
        assert created["items"][0]["quantity"] == 10
        assert created["total"] == 1000  # 10 * 100
        assert created["status"] == "received"
        
        print(f"Created purchase: {created['purchaseNumber']} with 1 item, total: ${created['total']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{created['_id']}")

    def test_create_purchase_with_multiple_items(self, api_client, test_supplier):
        """Test creating a purchase with multiple items - إضافة أكثر من صنف بنفس عملية الشراء"""
        unique_id = generate_unique_id()
        
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-MULTI-1-{unique_id}",
                    "name": "TEST_منتج متعدد 1",
                    "nameEn": "TEST_Multi Product 1",
                    "quantity": 5,
                    "unitCost": 50
                },
                {
                    "productId": None,
                    "sku": f"TEST-MULTI-2-{unique_id}",
                    "name": "TEST_منتج متعدد 2",
                    "nameEn": "TEST_Multi Product 2",
                    "quantity": 10,
                    "unitCost": 75
                },
                {
                    "productId": None,
                    "sku": f"TEST-MULTI-3-{unique_id}",
                    "name": "TEST_منتج متعدد 3",
                    "nameEn": "TEST_Multi Product 3",
                    "quantity": 3,
                    "unitCost": 200
                }
            ],
            "tax": 50,
            "discount": 25,
            "notes": "Test purchase - multiple items"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201, f"Failed to create purchase: {response.text}"
        
        created = response.json()
        
        # Verify multiple items
        assert len(created["items"]) == 3, f"Expected 3 items, got {len(created['items'])}"
        
        # Verify totals
        expected_subtotal = (5 * 50) + (10 * 75) + (3 * 200)  # 250 + 750 + 600 = 1600
        expected_total = expected_subtotal + 50 - 25  # 1600 + 50 - 25 = 1625
        
        assert created["subtotal"] == expected_subtotal, f"Expected subtotal {expected_subtotal}, got {created['subtotal']}"
        assert created["total"] == expected_total, f"Expected total {expected_total}, got {created['total']}"
        assert created["tax"] == 50
        assert created["discount"] == 25
        
        print(f"Created purchase with 3 items: subtotal=${expected_subtotal}, tax=50, discount=25, total=${expected_total}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{created['_id']}")

    def test_update_purchase_status(self, api_client, test_supplier):
        """Test updating purchase status - تعديل الحالة"""
        unique_id = generate_unique_id()
        
        # First create a purchase
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-STATUS-{unique_id}",
                    "name": "TEST_منتج للحالة",
                    "nameEn": "TEST_Status Product",
                    "quantity": 5,
                    "unitCost": 100
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": ""
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        created = create_response.json()
        purchase_id = created["_id"]
        
        # Update status to pending
        update_response = api_client.put(f"{BASE_URL}/api/purchases/{purchase_id}", json={
            "status": "pending"
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["status"] == "pending"
        
        # Update status to cancelled
        update_response = api_client.put(f"{BASE_URL}/api/purchases/{purchase_id}", json={
            "status": "cancelled"
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["status"] == "cancelled"
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["status"] == "cancelled"
        
        print(f"Status updated: received -> pending -> cancelled")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{purchase_id}")

    def test_update_purchase_tax_and_discount(self, api_client, test_supplier):
        """Test updating purchase tax and discount - تعديل الضريبة والخصم"""
        unique_id = generate_unique_id()
        
        # Create a purchase
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-TAX-{unique_id}",
                    "name": "TEST_منتج للضريبة",
                    "nameEn": "TEST_Tax Product",
                    "quantity": 10,
                    "unitCost": 100
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": ""
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        created = create_response.json()
        purchase_id = created["_id"]
        
        # Update tax
        update_response = api_client.put(f"{BASE_URL}/api/purchases/{purchase_id}", json={
            "tax": 150.5
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["tax"] == 150.5
        
        # Update discount
        update_response = api_client.put(f"{BASE_URL}/api/purchases/{purchase_id}", json={
            "discount": 50.25
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["discount"] == 50.25
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["tax"] == 150.5
        assert fetched["discount"] == 50.25
        
        print(f"Tax and discount updated: tax=150.5, discount=50.25")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{purchase_id}")

    def test_update_purchase_notes(self, api_client, test_supplier):
        """Test updating purchase notes - تعديل الملاحظات"""
        unique_id = generate_unique_id()
        
        # Create a purchase
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-NOTES-{unique_id}",
                    "name": "TEST_منتج للملاحظات",
                    "nameEn": "TEST_Notes Product",
                    "quantity": 5,
                    "unitCost": 50
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": "Original notes"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        created = create_response.json()
        purchase_id = created["_id"]
        
        # Update notes
        new_notes = "Updated notes - ملاحظات محدثة"
        update_response = api_client.put(f"{BASE_URL}/api/purchases/{purchase_id}", json={
            "notes": new_notes
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["notes"] == new_notes
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["notes"] == new_notes
        
        print(f"Notes updated to: {new_notes}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{purchase_id}")

    def test_update_purchase_all_fields(self, api_client, test_supplier):
        """Test updating all editable purchase fields at once"""
        unique_id = generate_unique_id()
        
        # Create a purchase
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-ALL-{unique_id}",
                    "name": "TEST_منتج للتحديث الكامل",
                    "nameEn": "TEST_Full Update Product",
                    "quantity": 20,
                    "unitCost": 80
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": ""
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        created = create_response.json()
        purchase_id = created["_id"]
        
        # Update all fields
        update_data = {
            "status": "pending",
            "tax": 200,
            "discount": 100,
            "notes": "Full update test - اختبار التحديث الكامل"
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/purchases/{purchase_id}", json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated["status"] == "pending"
        assert updated["tax"] == 200
        assert updated["discount"] == 100
        assert updated["notes"] == "Full update test - اختبار التحديث الكامل"
        
        print(f"All fields updated: status=pending, tax=200, discount=100")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{purchase_id}")

    def test_get_purchase_by_id(self, api_client, test_supplier):
        """Test getting a specific purchase by ID"""
        unique_id = generate_unique_id()
        
        # Create a purchase
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-GET-{unique_id}",
                    "name": "TEST_منتج للحصول",
                    "nameEn": "TEST_Get Product",
                    "quantity": 15,
                    "unitCost": 60
                }
            ],
            "tax": 10,
            "discount": 5,
            "notes": "Test get by ID"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        created = create_response.json()
        purchase_id = created["_id"]
        
        # Get by ID
        get_response = api_client.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        
        assert fetched["_id"] == purchase_id
        assert fetched["supplierId"] == test_supplier["_id"]
        assert len(fetched["items"]) == 1
        assert fetched["items"][0]["quantity"] == 15
        
        print(f"Retrieved purchase {purchase_id} successfully")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{purchase_id}")

    def test_delete_purchase(self, api_client, test_supplier):
        """Test deleting a purchase"""
        unique_id = generate_unique_id()
        
        # Create a purchase
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-DEL-{unique_id}",
                    "name": "TEST_منتج للحذف",
                    "nameEn": "TEST_Delete Product",
                    "quantity": 5,
                    "unitCost": 25
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": ""
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        created = create_response.json()
        purchase_id = created["_id"]
        
        # Delete
        delete_response = api_client.delete(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert delete_response.status_code == 204
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert get_response.status_code == 404
        
        print(f"Purchase {purchase_id} deleted successfully")


class TestProductCreationFromPurchase:
    """Tests for creating new products during purchase flow"""

    def test_create_product_api(self, api_client):
        """Test creating a new product via API - إضافة منتج جديد"""
        unique_id = generate_unique_id()
        
        product_data = {
            "name": f"TEST_منتج جديد من المشتريات_{unique_id}",
            "nameEn": f"TEST_New Product from Purchase_{unique_id}",
            "sku": f"TEST-NEW-PUR-{unique_id}",
            "category": "جديد",
            "categoryEn": "New",
            "costPrice": 75,
            "salePrice": 120,
            "stock": 0,
            "reorderLevel": 10
        }
        
        response = api_client.post(f"{BASE_URL}/api/products", json=product_data)
        assert response.status_code == 201, f"Failed to create product: {response.text}"
        
        created = response.json()
        assert created["name"] == product_data["name"]
        assert created["sku"] == product_data["sku"]
        assert created["stock"] == 0
        
        print(f"Created new product: {created['sku']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/products/{created['_id']}")

    def test_purchase_updates_inventory(self, api_client, test_supplier, test_product):
        """Test that purchase updates product inventory"""
        initial_stock = test_product["stock"]
        purchase_quantity = 25
        
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": test_product["_id"],
                    "sku": test_product["sku"],
                    "name": test_product["name"],
                    "nameEn": test_product["nameEn"],
                    "quantity": purchase_quantity,
                    "unitCost": 100
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": "Test inventory update"
        }
        
        # Create purchase
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201
        created = response.json()
        
        # Check product stock increased
        product_response = api_client.get(f"{BASE_URL}/api/products/{test_product['_id']}")
        assert product_response.status_code == 200
        updated_product = product_response.json()
        
        expected_stock = initial_stock + purchase_quantity
        assert updated_product["stock"] == expected_stock, f"Expected stock {expected_stock}, got {updated_product['stock']}"
        
        print(f"Stock updated: {initial_stock} -> {expected_stock}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{created['_id']}")


class TestErrorHandling:
    """Tests for error handling in purchases API"""

    def test_invalid_purchase_id(self, api_client):
        """Test GET with invalid purchase ID"""
        response = api_client.get(f"{BASE_URL}/api/purchases/invalid_id")
        assert response.status_code == 400
        print("Invalid purchase ID correctly returns 400")

    def test_nonexistent_purchase(self, api_client):
        """Test GET with non-existent purchase ID"""
        response = api_client.get(f"{BASE_URL}/api/purchases/507f1f77bcf86cd799439011")
        assert response.status_code == 404
        print("Non-existent purchase correctly returns 404")

    def test_update_empty_data(self, api_client, test_supplier):
        """Test updating with no data"""
        unique_id = generate_unique_id()
        
        # Create purchase
        purchase_data = {
            "supplierId": test_supplier["_id"],
            "supplierName": test_supplier["name"],
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-EMPTY-{unique_id}",
                    "name": "TEST_منتج فارغ",
                    "nameEn": "TEST_Empty Product",
                    "quantity": 5,
                    "unitCost": 30
                }
            ],
            "tax": 0,
            "discount": 0,
            "notes": ""
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        created = create_response.json()
        purchase_id = created["_id"]
        
        # Try to update with empty data
        update_response = api_client.put(f"{BASE_URL}/api/purchases/{purchase_id}", json={})
        assert update_response.status_code == 400
        
        print("Empty update correctly returns 400")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/purchases/{purchase_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
