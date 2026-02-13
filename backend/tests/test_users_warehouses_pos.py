"""
Backend API Tests for Users, Warehouses, and POS modules
Tests: CRUD operations for users, warehouses, and POS checkout with invoice creation
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


class TestUsersAPI:
    """Users CRUD API tests with role validation"""
    
    def test_get_users_list(self):
        """GET /api/users - should return list of users"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} users")
    
    def test_create_user_success(self):
        """POST /api/users - should create new user with all fields"""
        user_data = {
            "username": f"TEST_user_{int(time.time())}",
            "name": "TEST_مستخدم اختبار",
            "nameEn": "TEST_Test User",
            "email": f"test_user_{int(time.time())}@test.com",
            "phone": "0501234567",
            "role": "manager"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "_id" in data
        assert data["username"] == user_data["username"]
        assert data["name"] == user_data["name"]
        assert data["nameEn"] == user_data["nameEn"]
        assert data["email"] == user_data["email"]
        assert data["phone"] == user_data["phone"]
        assert data["role"] == "manager"
        assert data["isActive"] == True
        print(f"Created user with ID: {data['_id']}, role: {data['role']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/users/{data['_id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["username"] == user_data["username"]
        assert fetched["role"] == "manager"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{data['_id']}")
    
    def test_create_user_with_all_roles(self):
        """POST /api/users - should accept all valid roles (admin, manager, accountant, worker)"""
        roles = ["admin", "manager", "accountant", "worker"]
        created_ids = []
        
        for role in roles:
            user_data = {
                "username": f"TEST_role_{role}_{int(time.time())}",
                "name": f"TEST_مستخدم {role}",
                "nameEn": f"TEST_{role.capitalize()} User",
                "email": f"test_{role}_{int(time.time())}@test.com",
                "role": role
            }
            response = requests.post(f"{BASE_URL}/api/users", json=user_data)
            assert response.status_code == 201, f"Failed to create user with role: {role}"
            
            data = response.json()
            assert data["role"] == role
            created_ids.append(data["_id"])
            print(f"Created user with role: {role}")
        
        # Cleanup
        for user_id in created_ids:
            requests.delete(f"{BASE_URL}/api/users/{user_id}")
    
    def test_create_user_duplicate_username(self):
        """POST /api/users - should reject duplicate username"""
        timestamp = int(time.time())
        user_data = {
            "username": f"TEST_duplicate_{timestamp}",
            "name": "TEST_مستخدم أول",
            "nameEn": "TEST_First User",
            "email": f"first_{timestamp}@test.com"
        }
        response1 = requests.post(f"{BASE_URL}/api/users", json=user_data)
        assert response1.status_code == 201
        user_id = response1.json()["_id"]
        
        # Try to create another user with same username
        user_data2 = {
            "username": f"TEST_duplicate_{timestamp}",  # Same username
            "name": "TEST_مستخدم ثاني",
            "nameEn": "TEST_Second User",
            "email": f"second_{timestamp}@test.com"  # Different email
        }
        response2 = requests.post(f"{BASE_URL}/api/users", json=user_data2)
        assert response2.status_code == 400
        assert "Username already exists" in response2.json()["detail"]
        print("Duplicate username correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}")
    
    def test_create_user_duplicate_email(self):
        """POST /api/users - should reject duplicate email"""
        timestamp = int(time.time())
        user_data = {
            "username": f"TEST_email1_{timestamp}",
            "name": "TEST_مستخدم أول",
            "nameEn": "TEST_First User",
            "email": f"duplicate_{timestamp}@test.com"
        }
        response1 = requests.post(f"{BASE_URL}/api/users", json=user_data)
        assert response1.status_code == 201
        user_id = response1.json()["_id"]
        
        # Try to create another user with same email
        user_data2 = {
            "username": f"TEST_email2_{timestamp}",  # Different username
            "name": "TEST_مستخدم ثاني",
            "nameEn": "TEST_Second User",
            "email": f"duplicate_{timestamp}@test.com"  # Same email
        }
        response2 = requests.post(f"{BASE_URL}/api/users", json=user_data2)
        assert response2.status_code == 400
        assert "Email already exists" in response2.json()["detail"]
        print("Duplicate email correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}")
    
    def test_get_user_by_id(self):
        """GET /api/users/{id} - should return specific user"""
        user_data = {
            "username": f"TEST_getuser_{int(time.time())}",
            "name": "TEST_مستخدم للقراءة",
            "nameEn": "TEST_Read User",
            "email": f"read_{int(time.time())}@test.com"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=user_data)
        user_id = create_response.json()["_id"]
        
        response = requests.get(f"{BASE_URL}/api/users/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == user_id
        assert data["username"] == user_data["username"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}")
    
    def test_get_user_invalid_id(self):
        """GET /api/users/{id} - should return 400 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/users/invalid-id")
        assert response.status_code == 400
    
    def test_get_user_not_found(self):
        """GET /api/users/{id} - should return 404 for non-existent ID"""
        response = requests.get(f"{BASE_URL}/api/users/507f1f77bcf86cd799439011")
        assert response.status_code == 404
    
    def test_update_user(self):
        """PUT /api/users/{id} - should update user"""
        user_data = {
            "username": f"TEST_update_{int(time.time())}",
            "name": "TEST_مستخدم للتحديث",
            "nameEn": "TEST_Update User",
            "email": f"update_{int(time.time())}@test.com",
            "role": "worker"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=user_data)
        user_id = create_response.json()["_id"]
        
        # Update role and phone
        update_data = {"role": "accountant", "phone": "0509999999"}
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["role"] == "accountant"
        assert data["phone"] == "0509999999"
        assert data["username"] == user_data["username"]  # Unchanged
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/users/{user_id}")
        assert get_response.json()["role"] == "accountant"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}")
    
    def test_delete_user(self):
        """DELETE /api/users/{id} - should delete user"""
        user_data = {
            "username": f"TEST_delete_{int(time.time())}",
            "name": "TEST_مستخدم للحذف",
            "nameEn": "TEST_Delete User",
            "email": f"delete_{int(time.time())}@test.com"
        }
        create_response = requests.post(f"{BASE_URL}/api/users", json=user_data)
        user_id = create_response.json()["_id"]
        
        response = requests.delete(f"{BASE_URL}/api/users/{user_id}")
        assert response.status_code == 204
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/users/{user_id}")
        assert get_response.status_code == 404


class TestWarehousesAPI:
    """Warehouses CRUD API tests with code validation"""
    
    def test_get_warehouses_list(self):
        """GET /api/warehouses - should return list of warehouses"""
        response = requests.get(f"{BASE_URL}/api/warehouses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} warehouses")
    
    def test_create_warehouse_success(self):
        """POST /api/warehouses - should create new warehouse"""
        warehouse_data = {
            "name": "TEST_مستودع اختبار",
            "nameEn": "TEST_Test Warehouse",
            "code": f"TEST-WH-{int(time.time())}",
            "address": "الرياض - المنطقة الصناعية",
            "phone": "0501234567",
            "managerName": "أحمد محمد"
        }
        response = requests.post(f"{BASE_URL}/api/warehouses", json=warehouse_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "_id" in data
        assert data["name"] == warehouse_data["name"]
        assert data["nameEn"] == warehouse_data["nameEn"]
        assert data["code"] == warehouse_data["code"]
        assert data["address"] == warehouse_data["address"]
        assert data["phone"] == warehouse_data["phone"]
        assert data["managerName"] == warehouse_data["managerName"]
        assert data["isActive"] == True
        print(f"Created warehouse with ID: {data['_id']}, code: {data['code']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/warehouses/{data['_id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["code"] == warehouse_data["code"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/warehouses/{data['_id']}")
    
    def test_create_warehouse_duplicate_code(self):
        """POST /api/warehouses - should reject duplicate warehouse code"""
        timestamp = int(time.time())
        warehouse_data = {
            "name": "TEST_مستودع أول",
            "nameEn": "TEST_First Warehouse",
            "code": f"TEST-DUP-{timestamp}",
            "address": "الرياض"
        }
        response1 = requests.post(f"{BASE_URL}/api/warehouses", json=warehouse_data)
        assert response1.status_code == 201
        warehouse_id = response1.json()["_id"]
        
        # Try to create another warehouse with same code
        warehouse_data2 = {
            "name": "TEST_مستودع ثاني",
            "nameEn": "TEST_Second Warehouse",
            "code": f"TEST-DUP-{timestamp}",  # Same code
            "address": "جدة"
        }
        response2 = requests.post(f"{BASE_URL}/api/warehouses", json=warehouse_data2)
        assert response2.status_code == 400
        assert "Warehouse code already exists" in response2.json()["detail"]
        print("Duplicate warehouse code correctly rejected")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/warehouses/{warehouse_id}")
    
    def test_get_warehouse_by_id(self):
        """GET /api/warehouses/{id} - should return specific warehouse"""
        warehouse_data = {
            "name": "TEST_مستودع للقراءة",
            "nameEn": "TEST_Read Warehouse",
            "code": f"TEST-READ-{int(time.time())}",
            "address": "الدمام"
        }
        create_response = requests.post(f"{BASE_URL}/api/warehouses", json=warehouse_data)
        warehouse_id = create_response.json()["_id"]
        
        response = requests.get(f"{BASE_URL}/api/warehouses/{warehouse_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == warehouse_id
        assert data["code"] == warehouse_data["code"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/warehouses/{warehouse_id}")
    
    def test_get_warehouse_invalid_id(self):
        """GET /api/warehouses/{id} - should return 400 for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/warehouses/invalid-id")
        assert response.status_code == 400
    
    def test_get_warehouse_not_found(self):
        """GET /api/warehouses/{id} - should return 404 for non-existent ID"""
        response = requests.get(f"{BASE_URL}/api/warehouses/507f1f77bcf86cd799439011")
        assert response.status_code == 404
    
    def test_update_warehouse(self):
        """PUT /api/warehouses/{id} - should update warehouse"""
        warehouse_data = {
            "name": "TEST_مستودع للتحديث",
            "nameEn": "TEST_Update Warehouse",
            "code": f"TEST-UPD-{int(time.time())}",
            "address": "مكة"
        }
        create_response = requests.post(f"{BASE_URL}/api/warehouses", json=warehouse_data)
        warehouse_id = create_response.json()["_id"]
        
        # Update
        update_data = {"phone": "0503333333", "managerName": "محمد علي", "isActive": False}
        response = requests.put(f"{BASE_URL}/api/warehouses/{warehouse_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["phone"] == "0503333333"
        assert data["managerName"] == "محمد علي"
        assert data["isActive"] == False
        assert data["code"] == warehouse_data["code"]  # Unchanged
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/warehouses/{warehouse_id}")
        assert get_response.json()["isActive"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/warehouses/{warehouse_id}")
    
    def test_delete_warehouse(self):
        """DELETE /api/warehouses/{id} - should delete warehouse"""
        warehouse_data = {
            "name": "TEST_مستودع للحذف",
            "nameEn": "TEST_Delete Warehouse",
            "code": f"TEST-DEL-{int(time.time())}",
            "address": "المدينة"
        }
        create_response = requests.post(f"{BASE_URL}/api/warehouses", json=warehouse_data)
        warehouse_id = create_response.json()["_id"]
        
        response = requests.delete(f"{BASE_URL}/api/warehouses/{warehouse_id}")
        assert response.status_code == 204
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/warehouses/{warehouse_id}")
        assert get_response.status_code == 404


class TestPOSCheckout:
    """POS checkout tests - invoice creation and stock update"""
    
    def test_pos_checkout_creates_invoice(self):
        """POST /api/invoices - POS checkout should create invoice"""
        from datetime import datetime
        
        # Get a product with stock
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        product = next((p for p in products if p["stock"] > 0), None)
        
        if not product:
            pytest.skip("No products with stock available for testing")
        
        # Get or create a customer for testing
        customers_response = requests.get(f"{BASE_URL}/api/customers")
        customers = customers_response.json()
        customer = customers[0] if customers else None
        
        if not customer:
            # Create a test customer
            customer_data = {
                "name": "TEST_عميل اختبار",
                "nameEn": "TEST_Test Customer",
                "phone": "0501234567",
                "address": "الرياض"
            }
            customer_response = requests.post(f"{BASE_URL}/api/customers", json=customer_data)
            customer = customer_response.json()
        
        quantity = 1
        now = datetime.utcnow().isoformat()
        
        invoice_data = {
            "customerId": customer["_id"],
            "customerName": customer.get("name", "عميل نقدي"),
            "date": now,
            "dueDate": now,
            "items": [
                {
                    "productId": product["_id"],
                    "productName": product["name"],
                    "quantity": quantity,
                    "price": product["salePrice"],
                    "total": product["salePrice"] * quantity
                }
            ],
            "subtotal": product["salePrice"] * quantity,
            "tax": 0,
            "discount": 0,
            "total": product["salePrice"] * quantity,
            "status": "paid"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "_id" in data
        assert "invoiceNumber" in data
        assert data["invoiceNumber"].startswith("INV-")
        assert data["total"] == product["salePrice"] * quantity
        assert data["status"] == "paid"
        print(f"Created invoice: {data['invoiceNumber']}, total: {data['total']}")
    
    def test_pos_checkout_with_different_status(self):
        """POST /api/invoices - POS checkout with unpaid status"""
        from datetime import datetime
        
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        product = next((p for p in products if p["stock"] > 0), None)
        
        if not product:
            pytest.skip("No products with stock available for testing")
        
        customers_response = requests.get(f"{BASE_URL}/api/customers")
        customers = customers_response.json()
        customer = customers[0] if customers else None
        
        if not customer:
            pytest.skip("No customers available for testing")
        
        now = datetime.utcnow().isoformat()
        
        invoice_data = {
            "customerId": customer["_id"],
            "customerName": customer.get("nameEn", "Test Customer"),
            "date": now,
            "dueDate": now,
            "items": [
                {
                    "productId": product["_id"],
                    "productName": product["nameEn"],
                    "quantity": 2,
                    "price": product["salePrice"],
                    "total": product["salePrice"] * 2
                }
            ],
            "subtotal": product["salePrice"] * 2,
            "tax": 0,
            "discount": 0,
            "total": product["salePrice"] * 2,
            "status": "unpaid"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["status"] == "unpaid"
        print(f"Created unpaid invoice: {data['invoiceNumber']}")
    
    def test_pos_checkout_multiple_items(self):
        """POST /api/invoices - POS checkout with multiple items"""
        from datetime import datetime
        
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        available_products = [p for p in products if p["stock"] > 0]
        
        if len(available_products) < 2:
            pytest.skip("Need at least 2 products with stock for testing")
        
        customers_response = requests.get(f"{BASE_URL}/api/customers")
        customers = customers_response.json()
        customer = customers[0] if customers else None
        
        if not customer:
            pytest.skip("No customers available for testing")
        
        product1 = available_products[0]
        product2 = available_products[1]
        
        subtotal = product1["salePrice"] + product2["salePrice"]
        now = datetime.utcnow().isoformat()
        
        invoice_data = {
            "customerId": customer["_id"],
            "customerName": customer.get("name", "عميل نقدي"),
            "date": now,
            "dueDate": now,
            "items": [
                {
                    "productId": product1["_id"],
                    "productName": product1["name"],
                    "quantity": 1,
                    "price": product1["salePrice"],
                    "total": product1["salePrice"]
                },
                {
                    "productId": product2["_id"],
                    "productName": product2["name"],
                    "quantity": 1,
                    "price": product2["salePrice"],
                    "total": product2["salePrice"]
                }
            ],
            "subtotal": subtotal,
            "tax": 0,
            "discount": 0,
            "total": subtotal,
            "status": "paid"
        }
        
        response = requests.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 201
        
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == subtotal
        print(f"Created multi-item invoice: {data['invoiceNumber']}, items: {len(data['items'])}")
    
    def test_get_invoices_list(self):
        """GET /api/invoices - should return list of invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} invoices")
    
    def test_product_stock_update(self):
        """PUT /api/products/{id} - should update product stock (used by POS)"""
        # Get a product
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        product = next((p for p in products if p["stock"] > 5), None)
        
        if not product:
            pytest.skip("No products with sufficient stock for testing")
        
        initial_stock = product["stock"]
        new_stock = initial_stock - 1
        
        # Update stock (simulating POS checkout)
        response = requests.put(f"{BASE_URL}/api/products/{product['_id']}", json={"stock": new_stock})
        assert response.status_code == 200
        
        data = response.json()
        assert data["stock"] == new_stock
        print(f"Stock updated from {initial_stock} to {new_stock}")
        
        # Restore stock
        requests.put(f"{BASE_URL}/api/products/{product['_id']}", json={"stock": initial_stock})


class TestCustomersAPI:
    """Customers API tests (used by POS for customer selection)"""
    
    def test_get_customers_list(self):
        """GET /api/customers - should return list of customers"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} customers")


# Cleanup function to remove test data
def cleanup_test_data():
    """Remove all TEST_ prefixed data"""
    # Cleanup users
    users = requests.get(f"{BASE_URL}/api/users").json()
    for u in users:
        if u.get("username", "").startswith("TEST_") or u.get("name", "").startswith("TEST_"):
            requests.delete(f"{BASE_URL}/api/users/{u['_id']}")
    
    # Cleanup warehouses
    warehouses = requests.get(f"{BASE_URL}/api/warehouses").json()
    for w in warehouses:
        if w.get("name", "").startswith("TEST_") or w.get("code", "").startswith("TEST"):
            requests.delete(f"{BASE_URL}/api/warehouses/{w['_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
