"""
Unit tests for auth and RBAC
"""
import pytest
from utils.rbac import get_permissions_for_role, ROLE_PERMISSIONS


class TestRBAC:
    """Test role-based permissions"""

    def test_tenant_admin_has_all_permissions(self):
        perms = get_permissions_for_role("tenant_admin")
        assert perms.get("dashboard") is True
        assert perms.get("products") is True
        assert perms.get("invoices") is True
        assert perms.get("users") is True

    def test_cashier_has_limited_permissions(self):
        perms = get_permissions_for_role("cashier")
        assert perms.get("pos") is True
        assert perms.get("invoices") is True
        assert perms.get("products") is False
        assert perms.get("users") is False

    def test_inventory_manager_permissions(self):
        perms = get_permissions_for_role("inventory_manager")
        assert perms.get("products") is True
        assert perms.get("warehouses") is True
        assert perms.get("inventory_count") is True
        assert perms.get("pos") is False

    def test_unknown_role_defaults_to_worker(self):
        perms = get_permissions_for_role("unknown_role")
        assert perms.get("dashboard") is True
        assert perms.get("pos") is True

    def test_admin_alias_matches_tenant_admin(self):
        assert ROLE_PERMISSIONS["admin"] == ROLE_PERMISSIONS["tenant_admin"]
