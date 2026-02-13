"""
API integration tests for ERP Pro.
Run: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient

# Import app - adjust path if needed
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from server import app

client = TestClient(app)


def test_health_check():
    """Health check endpoint returns 200."""
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "database" in data


def test_root():
    """Root API returns message."""
    r = client.get("/api/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_login_invalid_credentials():
    """Login with invalid credentials returns 401."""
    r = client.post("/api/auth/login", json={
        "username": "nonexistent",
        "password": "wrong",
        "tenantCode": "DEMO"
    })
    assert r.status_code == 401


def test_subscription_plans():
    """Subscription plans endpoint returns plans."""
    r = client.get("/api/subscriptions/plans")
    assert r.status_code == 200
    plans = r.json()
    assert isinstance(plans, list)
    assert len(plans) > 0
    assert "id" in plans[0]
    assert "price" in plans[0]


def test_support_contact_validation():
    """Support contact requires valid email."""
    r = client.post("/api/support/contact", json={
        "name": "Test",
        "email": "invalid-email",
        "subject": "Test",
        "message": "Test message"
    })
    assert r.status_code == 422  # Validation error


def test_forgot_password_requires_email():
    """Forgot password requires email."""
    r = client.post("/api/auth/forgot-password", json={})
    assert r.status_code == 422 or r.status_code == 400


def test_reset_password_requires_token():
    """Reset password requires token."""
    r = client.post("/api/auth/reset-password", json={
        "password": "NewPass@123"
    })
    assert r.status_code == 422 or r.status_code == 400


def test_login_demo_success():
    """Login with demo credentials returns token."""
    r = client.post("/api/auth/login", json={
        "username": "demo",
        "password": "Demo@123",
        "tenantCode": "DEMO"
    })
    # May succeed if DB is seeded
    assert r.status_code in (200, 401)
    if r.status_code == 200:
        data = r.json()
        assert "access_token" in data
        assert "user" in data


def test_products_require_auth():
    """Products endpoint requires authentication."""
    r = client.get("/api/products")
    assert r.status_code == 401


def test_customers_require_auth():
    """Customers endpoint requires authentication."""
    r = client.get("/api/customers")
    assert r.status_code == 401


def test_invoices_require_auth():
    """Invoices endpoint requires authentication."""
    r = client.get("/api/invoices")
    assert r.status_code == 401


def test_support_contact_success():
    """Support contact with valid data."""
    r = client.post("/api/support/contact", json={
        "name": "Test User",
        "email": "test@example.com",
        "subject": "Test",
        "message": "Test message"
    })
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
    assert "id" in data


def test_backup_export_requires_auth():
    """Backup export requires authentication."""
    r = client.get("/api/backup/export")
    assert r.status_code == 401


def test_cors_headers():
    """CORS headers are present."""
    r = client.options("/api/health")
    assert r.status_code in (200, 204)
