# Role-Based Access Control - predefined roles and their permissions

# All permission keys used in the app (must match Layout.js and require_permission)
PERMISSION_KEYS = [
    "dashboard", "products", "inventory_count", "invoices", "customers",
    "suppliers", "purchases", "pos", "users", "reports", "accounting", "warehouses",
]

# Role presets: each role gets a dict of permission_key -> True
ROLE_PERMISSIONS = {
    "tenant_admin": {k: True for k in PERMISSION_KEYS},
    "cashier": {
        "dashboard": True,
        "pos": True,
        "invoices": True,
        "customers": True,
    },
    "inventory_manager": {
        "dashboard": True,
        "products": True,
        "warehouses": True,
        "inventory_count": True,
        "purchases": True,
        "suppliers": True,
    },
    "accountant": {
        "dashboard": True,
        "invoices": True,
        "reports": True,
        "accounting": True,
        "customers": True,
    },
    "worker": {
        "dashboard": True,
        "pos": True,
    },
}

# Backward compatibility: old role names
ROLE_PERMISSIONS["admin"] = ROLE_PERMISSIONS["tenant_admin"]
ROLE_PERMISSIONS["manager"] = ROLE_PERMISSIONS["inventory_manager"]

def get_permissions_for_role(role: str) -> dict:
    """Return permissions dict for a role. Defaults to worker if unknown."""
    return ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS["worker"]).copy()
