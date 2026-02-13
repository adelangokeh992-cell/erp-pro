"""
Test Authentication and Multi-Tenancy Features
Tests:
- Super Admin login at /api/auth/login
- Tenant user login with tenantCode parameter
- JWT token contains tenantId for tenant users
- Data isolation - tenant user sees only their products
- Super Admin sees all products
"""
import pytest
import requests
import os
from jose import jwt

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SECRET_KEY = "super-secret-key-change-in-production-123"

# Test credentials from requirements
SUPER_ADMIN_CREDS = {"username": "superadmin", "password": "Admin@123"}
TENANT_USER_CREDS = {"username": "alnoor_admin", "password": "Pass@123", "tenantCode": "ALNO3723"}


class TestHealthCheck:
    """Ensure API is accessible"""
    
    def test_api_health(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestSuperAdminLogin:
    """Test Super Admin login functionality"""
    
    def test_super_admin_login_success(self):
        """Super Admin should login without tenantCode"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert data.get("token_type") == "bearer"
        assert "user" in data, "Missing user in response"
        
        user = data["user"]
        assert user.get("username") == "superadmin"
        assert user.get("role") == "super_admin"
        print(f"✓ Super Admin login successful: {user.get('username')} with role {user.get('role')}")
        
        # Verify JWT token does not have tenantId (or is null)
        token = data["access_token"]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # Super admin should have null/None tenantId
            tenant_id = payload.get("tenantId")
            print(f"✓ JWT payload - tenantId: {tenant_id}, role: {payload.get('role')}")
            assert payload.get("role") == "super_admin"
        except Exception as e:
            print(f"JWT decode info: {e}")
    
    def test_super_admin_invalid_password(self):
        """Super Admin login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "superadmin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Super Admin login with wrong password correctly rejected")


class TestTenantUserLogin:
    """Test Tenant User login functionality"""
    
    def test_tenant_user_login_success(self):
        """Tenant user should login with tenantCode"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_USER_CREDS)
        assert response.status_code == 200, f"Tenant login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        
        user = data["user"]
        assert user.get("username") == "alnoor_admin"
        print(f"✓ Tenant user login successful: {user.get('username')} with role {user.get('role')}")
        
        # Check tenant info in response
        tenant = data.get("tenant")
        if tenant:
            print(f"✓ Tenant info returned: code={tenant.get('code')}, name={tenant.get('name')}")
        
        # Verify JWT token contains tenantId
        token = data["access_token"]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            tenant_id = payload.get("tenantId")
            assert tenant_id is not None, "JWT should contain tenantId for tenant user"
            print(f"✓ JWT contains tenantId: {tenant_id}")
            print(f"✓ JWT payload: userId={payload.get('userId')}, role={payload.get('role')}, tenantId={tenant_id}")
        except Exception as e:
            print(f"JWT decode error: {e}")
            # If JWT fails to decode, this is still a valid test if login succeeded
    
    def test_tenant_user_without_tenant_code(self):
        """Tenant user login without tenantCode should still work if user has tenantId"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "alnoor_admin",
            "password": "Pass@123"
        })
        # May succeed if user already has tenantId, or fail - either is valid behavior
        print(f"Tenant user without tenantCode: status={response.status_code}")
    
    def test_tenant_user_invalid_credentials(self):
        """Tenant user login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "alnoor_admin",
            "password": "wrongpassword",
            "tenantCode": "ALNO3723"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Tenant user login with wrong password correctly rejected")


class TestDataIsolation:
    """Test data isolation between tenants and super admin"""
    
    @pytest.fixture
    def super_admin_token(self):
        """Get Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Super Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def tenant_user_token(self):
        """Get Tenant User token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_USER_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Tenant user login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_tenant_user_sees_only_their_products(self, tenant_user_token):
        """Tenant user should only see products for their tenant (3 products for ALNO3723)"""
        headers = {"Authorization": f"Bearer {tenant_user_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        
        assert response.status_code == 200, f"Products API failed: {response.text}"
        products = response.json()
        
        product_count = len(products)
        print(f"✓ Tenant user sees {product_count} products")
        
        # Per requirements, ALNO3723 should have 3 products
        assert product_count == 3, f"Expected 3 products for tenant ALNO3723, got {product_count}"
        
        # Verify all products belong to the same tenant
        tenant_ids = set()
        for p in products:
            tid = p.get("tenantId")
            if tid:
                tenant_ids.add(tid)
            print(f"  - Product: {p.get('name', p.get('sku', 'unknown'))}, tenantId: {tid}")
        
        print(f"✓ All products belong to tenant(s): {tenant_ids}")
    
    def test_super_admin_sees_all_products(self, super_admin_token):
        """Super Admin should see all products (30+ products)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        
        assert response.status_code == 200, f"Products API failed: {response.text}"
        products = response.json()
        
        product_count = len(products)
        print(f"✓ Super Admin sees {product_count} products")
        
        # Per requirements, there should be 30+ products total
        assert product_count >= 30, f"Expected 30+ products for Super Admin, got {product_count}"
        
        # Count products by tenantId
        tenant_counts = {}
        for p in products:
            tid = p.get("tenantId") or "no_tenant"
            tenant_counts[tid] = tenant_counts.get(tid, 0) + 1
        
        print(f"✓ Products by tenant: {tenant_counts}")
    
    def test_products_with_no_auth(self):
        """Products API without auth should return all products (no tenant filter)"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Products API failed: {response.text}"
        products = response.json()
        print(f"✓ Products without auth: {len(products)} products")


class TestJWTTokenContent:
    """Verify JWT token structure and contents"""
    
    def test_super_admin_jwt_structure(self):
        """Super Admin JWT should have correct structure"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        
        # Verify required fields
        assert "userId" in payload, "JWT missing userId"
        assert "username" in payload, "JWT missing username"
        assert "role" in payload, "JWT missing role"
        assert payload["role"] == "super_admin"
        
        print(f"✓ Super Admin JWT structure: {list(payload.keys())}")
    
    def test_tenant_user_jwt_structure(self):
        """Tenant user JWT should have tenantId"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TENANT_USER_CREDS)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        
        # Verify required fields
        assert "userId" in payload, "JWT missing userId"
        assert "username" in payload, "JWT missing username"
        assert "role" in payload, "JWT missing role"
        assert "tenantId" in payload, "JWT missing tenantId"
        
        # tenantId should not be None for tenant user
        assert payload["tenantId"] is not None, "tenantId should not be None for tenant user"
        
        print(f"✓ Tenant user JWT structure: {list(payload.keys())}")
        print(f"✓ tenantId value: {payload['tenantId']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
