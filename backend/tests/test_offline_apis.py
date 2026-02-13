"""
Backend API Tests for Offline Mode ERP System
Tests all core APIs that support offline functionality
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasicAPIs:
    """Test health check and basic API endpoints"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"Health check passed: {data}")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Root endpoint: {data}")


class TestProductsAPI:
    """Test Products API - critical for offline POS"""
    
    def test_get_all_products(self):
        """Test GET /api/products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Products count: {len(data)}")
        
        # Verify product structure
        if len(data) > 0:
            product = data[0]
            assert "_id" in product
            assert "name" in product
            assert "salePrice" in product
            assert "stock" in product
    
    def test_get_product_by_id(self):
        """Test GET /api/products/{id}"""
        # First get a product ID
        response = requests.get(f"{BASE_URL}/api/products")
        products = response.json()
        if len(products) > 0:
            product_id = products[0]["_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            product = response.json()
            assert product["_id"] == product_id
            print(f"Got product: {product['name']}")


class TestCustomersAPI:
    """Test Customers API"""
    
    def test_get_all_customers(self):
        """Test GET /api/customers"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Customers count: {len(data)}")


class TestInvoicesAPI:
    """Test Invoices API - critical for offline POS checkout"""
    
    def test_get_all_invoices(self):
        """Test GET /api/invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Invoices count: {len(data)}")
    
    def test_create_invoice(self):
        """Test POST /api/invoices - POS checkout"""
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if len(products) > 0:
            product = products[0]
            
            invoice_data = {
                "customerId": None,
                "customerName": "TEST_Cash Customer",
                "items": [{
                    "productId": product["_id"],
                    "productName": product["name"],
                    "quantity": 1,
                    "price": product["salePrice"],
                    "total": product["salePrice"]
                }],
                "subtotal": product["salePrice"],
                "tax": 0,
                "discount": 0,
                "total": product["salePrice"],
                "status": "paid",
                "paymentMethod": "cash"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/invoices",
                json=invoice_data,
                headers={"Content-Type": "application/json"}
            )
            
            assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
            created_invoice = response.json()
            assert "_id" in created_invoice
            assert "invoiceNumber" in created_invoice
            print(f"Created invoice: {created_invoice['invoiceNumber']}")
            
            # Verify invoice was created
            get_response = requests.get(f"{BASE_URL}/api/invoices/{created_invoice['_id']}")
            assert get_response.status_code == 200
            fetched_invoice = get_response.json()
            assert fetched_invoice["_id"] == created_invoice["_id"]


class TestSuppliersAPI:
    """Test Suppliers API"""
    
    def test_get_all_suppliers(self):
        """Test GET /api/suppliers"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Suppliers count: {len(data)}")


class TestPurchasesAPI:
    """Test Purchases API"""
    
    def test_get_all_purchases(self):
        """Test GET /api/purchases"""
        response = requests.get(f"{BASE_URL}/api/purchases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Purchases count: {len(data)}")


class TestWarehousesAPI:
    """Test Warehouses API"""
    
    def test_get_all_warehouses(self):
        """Test GET /api/warehouses"""
        response = requests.get(f"{BASE_URL}/api/warehouses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Warehouses count: {len(data)}")


class TestAccountingAPI:
    """Test Accounting API"""
    
    def test_get_expenses(self):
        """Test GET /api/accounting/expenses"""
        response = requests.get(f"{BASE_URL}/api/accounting/expenses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Expenses count: {len(data)}")
    
    def test_get_accounts(self):
        """Test GET /api/accounting/accounts"""
        response = requests.get(f"{BASE_URL}/api/accounting/accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Accounts count: {len(data)}")


class TestDashboardAPI:
    """Test Dashboard API"""
    
    def test_get_dashboard_stats(self):
        """Test GET /api/dashboard/stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        # Dashboard returns counts, inventory, sales, purchases
        assert "counts" in data or "inventory" in data or "sales" in data
        print(f"Dashboard stats keys: {list(data.keys())}")


class TestReportsAPI:
    """Test Reports API"""
    
    def test_get_sales_report(self):
        """Test GET /api/reports/sales"""
        response = requests.get(f"{BASE_URL}/api/reports/sales")
        assert response.status_code == 200
        data = response.json()
        print(f"Sales report: {data}")
    
    def test_get_inventory_report(self):
        """Test GET /api/reports/inventory"""
        response = requests.get(f"{BASE_URL}/api/reports/inventory")
        assert response.status_code == 200
        data = response.json()
        print(f"Inventory report keys: {list(data.keys())}")


class TestAuthAPI:
    """Test Authentication API"""
    
    def test_login(self):
        """Test POST /api/auth/login"""
        login_data = {
            "username": "admin",
            "password": "123456"
        }
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data or "user" in data
        print(f"Login successful: {list(data.keys())}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        login_data = {
            "username": "invalid_user",
            "password": "wrong_password"
        }
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [401, 400, 404]
        print(f"Invalid login rejected with status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
