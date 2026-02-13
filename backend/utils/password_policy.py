"""
Password policy validation for production security.
"""
import re
from typing import Tuple


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message).
    Min 8 chars, uppercase, lowercase, number, special char.
    """
    if not password or len(password) < 8:
        return False, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    if len(password) > 128:
        return False, "كلمة المرور طويلة جداً"
    if not re.search(r"[A-Z]", password):
        return False, "كلمة المرور يجب أن تحتوي حرفاً كبيراً واحداً على الأقل"
    if not re.search(r"[a-z]", password):
        return False, "كلمة المرور يجب أن تحتوي حرفاً صغيراً واحداً على الأقل"
    if not re.search(r"\d", password):
        return False, "كلمة المرور يجب أن تحتوي رقماً واحداً على الأقل"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        return False, "كلمة المرور يجب أن تحتوي رمزاً خاصاً واحداً على الأقل (!@#$%...)"
    return True, ""


def validate_password_en(password: str) -> Tuple[bool, str]:
    """English error messages for password validation."""
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters"
    if len(password) > 128:
        return False, "Password is too long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        return False, "Password must contain at least one special character (!@#$%...)"
    return True, ""
