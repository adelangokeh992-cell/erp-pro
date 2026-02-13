"""
Email service - SMTP for welcome emails, support, password reset.
Uses env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SUPPORT_EMAIL, FRONTEND_URL
"""
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def _get_smtp_config():
    host = os.environ.get("SMTP_HOST", "").strip()
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").strip()
    return host, port, user, password


def is_email_configured() -> bool:
    """Check if SMTP is configured."""
    host, _, user, password = _get_smtp_config()
    return bool(host and user and password)


async def send_email(to: str, subject: str, body_html: str, body_text: str = None) -> bool:
    """
    Send email via SMTP. Returns True if sent, False otherwise.
    """
    host, port, user, password = _get_smtp_config()
    if not host or not user or not password:
        logger.warning("SMTP not configured - email not sent to %s", to)
        return False

    try:
        import smtplib

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = user
        msg["To"] = to

        if body_text:
            msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(user, to, msg.as_string())

        logger.info("Email sent to %s: %s", to, subject[:50])
        return True
    except Exception as e:
        logger.exception("Failed to send email to %s: %s", to, e)
        return False


async def send_welcome_email(tenant_name: str, tenant_email: str, tenant_code: str) -> bool:
    """Send welcome email after tenant creation."""
    frontend_url = os.environ.get("FRONTEND_URL", "https://app.erppro.com").rstrip("/")
    login_url = f"{frontend_url}/login"

    subject = f"مرحباً بك في ERP Pro - {tenant_name}"
    body_html = f"""
    <html><body dir="rtl" style="font-family: Arial, sans-serif;">
    <h2>مرحباً بك في ERP Pro!</h2>
    <p>تم إنشاء شركتك <strong>{tenant_name}</strong> بنجاح.</p>
    <p>رمز الشركة: <code>{tenant_code}</code></p>
    <p>يمكنك تسجيل الدخول من: <a href="{login_url}">{login_url}</a></p>
    <p>شكراً لاختيارك ERP Pro.</p>
    </body></html>
    """
    body_text = f"مرحباً بك في ERP Pro! تم إنشاء شركتك {tenant_name}. رمز الشركة: {tenant_code}. تسجيل الدخول: {login_url}"

    return await send_email(tenant_email, subject, body_html, body_text)


async def send_support_notification(name: str, email: str, subject: str, message: str) -> bool:
    """Notify support team of new contact request."""
    support_email = os.environ.get("SUPPORT_EMAIL", "").strip()
    if not support_email:
        logger.warning("SUPPORT_EMAIL not set - support notification not sent")
        return False

    subj = f"[Support] {subject} - from {name}"
    body_html = f"""
    <html><body style="font-family: Arial, sans-serif;">
    <h3>طلب دعم جديد</h3>
    <p><strong>الاسم:</strong> {name}</p>
    <p><strong>البريد:</strong> {email}</p>
    <p><strong>الموضوع:</strong> {subject}</p>
    <p><strong>الرسالة:</strong></p>
    <pre>{message}</pre>
    </body></html>
    """
    return await send_email(support_email, subj, body_html)


async def send_password_reset_email(email: str, reset_token: str, lang: str = "ar") -> bool:
    """Send password reset link."""
    frontend_url = os.environ.get("FRONTEND_URL", "https://app.erppro.com").rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"

    if lang == "en":
        subject = "ERP Pro - Password Reset"
        body_html = f"""
        <html><body style="font-family: Arial, sans-serif;">
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="{reset_url}">{reset_url}</a></p>
        <p>This link expires in 1 hour.</p>
        </body></html>
        """
    else:
        subject = "ERP Pro - استعادة كلمة المرور"
        body_html = f"""
        <html><body dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>استعادة كلمة المرور</h2>
        <p>اضغط على الرابط أدناه لإعادة تعيين كلمة المرور:</p>
        <p><a href="{reset_url}">{reset_url}</a></p>
        <p>ينتهي صلاحية هذا الرابط خلال ساعة.</p>
        </body></html>
        """

    return await send_email(email, subject, body_html)
