"""
Support Routes - Contact form for support requests
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime, timezone

router = APIRouter(prefix="/api/support", tags=["support"])


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    subject: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


@router.post("/contact")
async def contact_support(data: ContactRequest):
    """
    Submit a support contact request.
    Stores in DB or sends email if SMTP configured.
    """
    from server import db

    doc = {
        "name": data.name,
        "email": data.email,
        "subject": data.subject,
        "message": data.message,
        "status": "pending",
        "createdAt": datetime.now(timezone.utc),
    }

    result = await db.support_requests.insert_one(doc)

    # Notify support team via email if configured
    try:
        from services.email_service import send_support_notification
        await send_support_notification(
            name=data.name,
            email=data.email,
            subject=data.subject,
            message=data.message,
        )
    except Exception:
        pass  # Non-blocking

    return {"ok": True, "id": str(result.inserted_id), "message": "Request received"}
