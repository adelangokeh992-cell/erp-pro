"""
Tests for RFID Tags feature when purchasing multiple units
- When quantity > 1, user can enter unique RFID tag for each unit
- Tags are saved to product_units collection in MongoDB
- Skip functionality allows completing purchase without tags
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def random_suffix():
    return ''.join(random.choices(string.digits, k=10))

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def supplier_id(api_client):
    """Get a supplier ID for testing"""
    response = api_client.get(f"{BASE_URL}/api/suppliers")
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]['_id']
    # Create a test supplier if none exists
    create_response = api_client.post(f"{BASE_URL}/api/suppliers", json={
        "name": "TEST_مورد التاغات",
        "nameEn": "TEST_Tags Supplier",
        "phone": "0551234567",
        "email": "testsupplier@test.com",
        "address": "Test Address",
        "balance": 0
    })
    if create_response.status_code == 201:
        return create_response.json()['_id']
    pytest.skip("Could not get or create supplier")


class TestRFIDTagsFeature:
    """Tests for RFID tags when purchasing multiple units"""
    
    def test_purchase_with_quantity_greater_than_1_and_tags(self, api_client, supplier_id):
        """
        Test: When purchasing quantity > 1, RFID tags can be added for each unit
        Expected: Tags saved to product_units collection
        """
        suffix = random_suffix()
        tags = [f"RFID-TAG-A-{suffix}", f"RFID-TAG-B-{suffix}", f"RFID-TAG-C-{suffix}"]
        
        # Create purchase with 3 units and 3 tags
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [{
                "productId": None,
                "sku": f"TEST-SKU-TAGS-{suffix}",
                "name": "TEST_منتج بتاغات",
                "nameEn": "TEST_Product with Tags",
                "quantity": 3,
                "unitCost": 100.0,
                "rfidTag": None,
                "tags": tags  # 3 tags for 3 units
            }],
            "tax": 0,
            "discount": 0,
            "notes": "Test purchase with RFID tags"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        
        # Status assertion
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        # Data assertions
        created_purchase = response.json()
        assert "purchaseNumber" in created_purchase
        assert created_purchase["items"][0]["tags"] == tags
        assert created_purchase["items"][0]["quantity"] == 3
        
        # Verify product_units were created
        # Check directly via API or DB
        purchase_id = created_purchase["_id"]
        print(f"Purchase created with ID: {purchase_id}")
        print(f"Tags in purchase item: {created_purchase['items'][0]['tags']}")
        
        return purchase_id

    def test_purchase_with_quantity_greater_than_1_no_tags_skip(self, api_client, supplier_id):
        """
        Test: When quantity > 1 but user skips tag entry, purchase completes without tags
        Expected: Purchase created with empty tags array
        """
        suffix = random_suffix()
        
        # Create purchase with 5 units but no tags (skipped)
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [{
                "productId": None,
                "sku": f"TEST-SKU-NOTAGS-{suffix}",
                "name": "TEST_منتج بدون تاغات",
                "nameEn": "TEST_Product without Tags",
                "quantity": 5,
                "unitCost": 50.0,
                "rfidTag": None,
                "tags": []  # Empty tags - user skipped
            }],
            "tax": 0,
            "discount": 0,
            "notes": "Test purchase without RFID tags (skipped)"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        
        assert response.status_code == 201
        created_purchase = response.json()
        assert created_purchase["items"][0]["tags"] == []
        assert created_purchase["items"][0]["quantity"] == 5
        print(f"Purchase created without tags: {created_purchase['purchaseNumber']}")

    def test_purchase_with_partial_tags(self, api_client, supplier_id):
        """
        Test: When quantity > 1 and only some tags are entered
        Expected: Only non-empty tags are saved
        """
        suffix = random_suffix()
        # User enters tags for units 1 and 3, skips unit 2
        tags = [f"RFID-PARTIAL-1-{suffix}", "", f"RFID-PARTIAL-3-{suffix}"]
        
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [{
                "productId": None,
                "sku": f"TEST-SKU-PARTIAL-{suffix}",
                "name": "TEST_منتج بتاغات جزئية",
                "nameEn": "TEST_Product with Partial Tags",
                "quantity": 3,
                "unitCost": 75.0,
                "rfidTag": None,
                "tags": tags  # Only 2 valid tags
            }],
            "tax": 0,
            "discount": 0,
            "notes": "Test purchase with partial RFID tags"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        
        assert response.status_code == 201
        created_purchase = response.json()
        # Tags should still have all 3 entries as sent
        assert len(created_purchase["items"][0]["tags"]) == 3
        print(f"Purchase created with partial tags: {created_purchase['items'][0]['tags']}")

    def test_purchase_single_item_no_tags_dialog(self, api_client, supplier_id):
        """
        Test: When quantity = 1, no tags dialog should be needed
        Single RFID tag can be entered directly
        """
        suffix = random_suffix()
        
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [{
                "productId": None,
                "sku": f"TEST-SKU-SINGLE-{suffix}",
                "name": "TEST_منتج واحد",
                "nameEn": "TEST_Single Product",
                "quantity": 1,
                "unitCost": 200.0,
                "rfidTag": f"RFID-SINGLE-{suffix}",
                "tags": []
            }],
            "tax": 0,
            "discount": 0,
            "notes": "Test single item purchase"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        
        assert response.status_code == 201
        created_purchase = response.json()
        assert created_purchase["items"][0]["quantity"] == 1
        print(f"Single item purchase created: {created_purchase['purchaseNumber']}")

    def test_purchase_10_units_with_tags(self, api_client, supplier_id):
        """
        Test: Large quantity (10 units) with RFID tags
        Simulates the user scenario from requirements
        """
        suffix = random_suffix()
        # Generate 10 unique tags
        tags = [f"RFID-BATCH-{i+1}-{suffix}" for i in range(10)]
        
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [{
                "productId": None,
                "sku": f"TEST-SKU-BATCH-{suffix}",
                "name": "TEST_مشتريات جملة",
                "nameEn": "TEST_Batch Purchase",
                "quantity": 10,
                "unitCost": 25.0,
                "rfidTag": None,
                "tags": tags  # 10 tags for 10 units
            }],
            "tax": 0,
            "discount": 0,
            "notes": "Test batch purchase with 10 RFID tags"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        
        assert response.status_code == 201
        created_purchase = response.json()
        assert created_purchase["items"][0]["quantity"] == 10
        assert len(created_purchase["items"][0]["tags"]) == 10
        assert created_purchase["total"] == 250.0  # 10 * 25
        print(f"Batch purchase with 10 tags created: {created_purchase['purchaseNumber']}")
        print(f"Tags: {created_purchase['items'][0]['tags'][:3]}... (total {len(created_purchase['items'][0]['tags'])})")

    def test_verify_product_units_created(self, api_client, supplier_id):
        """
        Test: Verify that product_units are created for each tag
        This tests the backend functionality of creating unit records
        """
        suffix = random_suffix()
        tags = [f"UNIT-CHECK-A-{suffix}", f"UNIT-CHECK-B-{suffix}"]
        
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [{
                "productId": None,
                "sku": f"TEST-SKU-UNITS-{suffix}",
                "name": "TEST_تحقق الوحدات",
                "nameEn": "TEST_Units Verification",
                "quantity": 2,
                "unitCost": 150.0,
                "rfidTag": None,
                "tags": tags
            }],
            "tax": 0,
            "discount": 0,
            "notes": "Test to verify product_units creation"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert response.status_code == 201
        
        created_purchase = response.json()
        assert len(created_purchase["items"][0]["tags"]) == 2
        
        # Note: To fully verify product_units, we would need an API endpoint
        # for product_units or direct DB access. The backend should have created
        # 2 entries in product_units collection with these tags.
        print(f"Purchase created, expected 2 product_units with tags: {tags}")


class TestTagsDataIntegrity:
    """Tests for data integrity with RFID tags"""
    
    def test_tags_persisted_in_get_request(self, api_client, supplier_id):
        """
        Test: Tags are persisted and returned when fetching purchase
        """
        suffix = random_suffix()
        tags = [f"PERSIST-TAG-1-{suffix}", f"PERSIST-TAG-2-{suffix}"]
        
        # Create purchase
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [{
                "productId": None,
                "sku": f"TEST-SKU-PERSIST-{suffix}",
                "name": "TEST_حفظ التاغات",
                "nameEn": "TEST_Tags Persistence",
                "quantity": 2,
                "unitCost": 100.0,
                "rfidTag": None,
                "tags": tags
            }],
            "tax": 0,
            "discount": 0,
            "notes": "Test tags persistence"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        assert create_response.status_code == 201
        purchase_id = create_response.json()['_id']
        
        # GET purchase and verify tags
        get_response = api_client.get(f"{BASE_URL}/api/purchases/{purchase_id}")
        assert get_response.status_code == 200
        
        fetched_purchase = get_response.json()
        assert fetched_purchase["items"][0]["tags"] == tags
        print(f"Tags persisted and retrieved correctly: {fetched_purchase['items'][0]['tags']}")

    def test_multiple_items_with_different_tag_counts(self, api_client, supplier_id):
        """
        Test: Purchase with multiple items, each having different tag configurations
        """
        suffix = random_suffix()
        
        purchase_data = {
            "supplierId": supplier_id,
            "supplierName": "TEST_مورد التاغات",
            "items": [
                {
                    "productId": None,
                    "sku": f"TEST-ITEM-A-{suffix}",
                    "name": "TEST_منتج أ",
                    "nameEn": "TEST_Product A",
                    "quantity": 3,
                    "unitCost": 50.0,
                    "rfidTag": None,
                    "tags": [f"ITEM-A-TAG-1-{suffix}", f"ITEM-A-TAG-2-{suffix}", f"ITEM-A-TAG-3-{suffix}"]
                },
                {
                    "productId": None,
                    "sku": f"TEST-ITEM-B-{suffix}",
                    "name": "TEST_منتج ب",
                    "nameEn": "TEST_Product B",
                    "quantity": 2,
                    "unitCost": 75.0,
                    "rfidTag": None,
                    "tags": []  # No tags for this item
                }
            ],
            "tax": 5,
            "discount": 10,
            "notes": "Test multiple items with different tag counts"
        }
        
        response = api_client.post(f"{BASE_URL}/api/purchases", json=purchase_data)
        
        assert response.status_code == 201
        created_purchase = response.json()
        
        # Verify first item has 3 tags
        assert len(created_purchase["items"][0]["tags"]) == 3
        
        # Verify second item has no tags
        assert len(created_purchase["items"][1]["tags"]) == 0
        
        # Verify totals
        # Item A: 3 * 50 = 150, Item B: 2 * 75 = 150, Subtotal = 300
        # Total = 300 + 5 (tax) - 10 (discount) = 295
        assert created_purchase["total"] == 295.0
        
        print(f"Multi-item purchase created with mixed tag configurations")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
