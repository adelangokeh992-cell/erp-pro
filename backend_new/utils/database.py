"""
Database Utilities
"""
from bson import ObjectId
from typing import Any, Dict


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    
    result = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            result[key] = value
    return result


def serialize_docs(docs: list) -> list:
    """Convert list of MongoDB documents to JSON serializable format"""
    return [serialize_doc(doc) for doc in docs]


def generate_tenant_code(name: str) -> str:
    """Generate a unique tenant code from company name"""
    import re
    import random
    import string
    
    # Remove special characters and spaces
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name)
    
    # Take first 4 characters
    prefix = clean_name[:4].upper() if len(clean_name) >= 4 else clean_name.upper()
    
    # Add random suffix
    suffix = ''.join(random.choices(string.digits, k=4))
    
    return f"{prefix}{suffix}"
