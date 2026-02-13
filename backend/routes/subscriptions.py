"""
Subscription Routes - Stripe Payment Integration
Multi-tenant subscription management
"""

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])

# Subscription Plans - Fixed prices (NEVER accept from frontend)
SUBSCRIPTION_PLANS = {
    "basic": {
        "name": "الباقة الأساسية",
        "nameEn": "Basic Plan",
        "price": 29.00,
        "currency": "usd",
        "duration_months": 1,
        "features": {
            "maxUsers": 5,
            "maxProducts": 1000,
            "maxWarehouses": 1,
            "maxInvoicesPerMonth": 100,
            "storageLimit": 1024,  # MB
        }
    },
    "professional": {
        "name": "الباقة الاحترافية",
        "nameEn": "Professional Plan",
        "price": 79.00,
        "currency": "usd",
        "duration_months": 1,
        "features": {
            "maxUsers": 25,
            "maxProducts": 10000,
            "maxWarehouses": 3,
            "maxInvoicesPerMonth": -1,  # Unlimited
            "storageLimit": 5120,  # MB
        }
    },
    "enterprise": {
        "name": "باقة الشركات",
        "nameEn": "Enterprise Plan",
        "price": 199.00,
        "currency": "usd",
        "duration_months": 1,
        "features": {
            "maxUsers": 100,
            "maxProducts": -1,  # Unlimited
            "maxWarehouses": 10,
            "maxInvoicesPerMonth": -1,
            "storageLimit": 20480,  # MB
        }
    },
    "basic_yearly": {
        "name": "الباقة الأساسية (سنوي)",
        "nameEn": "Basic Plan (Yearly)",
        "price": 290.00,  # 2 months free
        "currency": "usd",
        "duration_months": 12,
        "features": {
            "maxUsers": 5,
            "maxProducts": 1000,
            "maxWarehouses": 1,
            "maxInvoicesPerMonth": 100,
            "storageLimit": 1024,
        }
    },
    "professional_yearly": {
        "name": "الباقة الاحترافية (سنوي)",
        "nameEn": "Professional Plan (Yearly)",
        "price": 790.00,  # 2 months free
        "currency": "usd",
        "duration_months": 12,
        "features": {
            "maxUsers": 25,
            "maxProducts": 10000,
            "maxWarehouses": 3,
            "maxInvoicesPerMonth": -1,
            "storageLimit": 5120,
        }
    }
}


class CheckoutRequest(BaseModel):
    plan_id: str = Field(..., description="Subscription plan ID")
    tenant_id: str = Field(..., description="Tenant ID to subscribe")
    origin_url: str = Field(..., description="Frontend origin URL")


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


@router.get("/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    plans = []
    for plan_id, plan_data in SUBSCRIPTION_PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan_data["name"],
            "nameEn": plan_data["nameEn"],
            "price": plan_data["price"],
            "currency": plan_data["currency"],
            "duration_months": plan_data["duration_months"],
            "features": plan_data["features"]
        })
    return plans


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(request: CheckoutRequest, http_request: Request):
    """Create a Stripe checkout session for subscription"""
    from server import db
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionRequest
    )
    
    # Validate plan
    if request.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    plan = SUBSCRIPTION_PLANS[request.plan_id]
    
    # Validate tenant exists
    try:
        tenant = await db.tenants.find_one({"_id": ObjectId(request.tenant_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid tenant ID")
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get Stripe API key
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Build URLs from frontend origin
    origin_url = request.origin_url.rstrip('/')
    success_url = f"{origin_url}/admin/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/admin/tenants/{request.tenant_id}"
    
    # Initialize Stripe
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "tenant_id": request.tenant_id,
            "plan_id": request.plan_id,
            "plan_name": plan["nameEn"],
            "duration_months": str(plan["duration_months"])
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "sessionId": session.session_id,
        "tenantId": request.tenant_id,
        "planId": request.plan_id,
        "amount": plan["price"],
        "currency": plan["currency"],
        "status": "pending",
        "paymentStatus": "initiated",
        "metadata": {
            "planName": plan["nameEn"],
            "durationMonths": plan["duration_months"]
        },
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    return CheckoutResponse(
        checkout_url=session.url,
        session_id=session.session_id
    )


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    """Get the status of a checkout session"""
    from server import db
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    # Get status from Stripe
    status_response = await stripe_checkout.get_checkout_status(session_id)
    
    # Get transaction from database
    transaction = await db.payment_transactions.find_one({"sessionId": session_id})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction if payment is complete and not already processed
    if status_response.payment_status == "paid" and transaction.get("paymentStatus") != "paid":
        # Update transaction status
        await db.payment_transactions.update_one(
            {"sessionId": session_id, "paymentStatus": {"$ne": "paid"}},
            {
                "$set": {
                    "status": "completed",
                    "paymentStatus": "paid",
                    "updatedAt": datetime.now(timezone.utc)
                }
            }
        )
        
        # Get plan details
        plan_id = transaction.get("planId")
        plan = SUBSCRIPTION_PLANS.get(plan_id, {})
        duration_months = plan.get("duration_months", 1)
        
        # Update tenant subscription
        tenant_id = transaction.get("tenantId")
        current_expiry = await db.tenants.find_one(
            {"_id": ObjectId(tenant_id)},
            {"subscription.expiryDate": 1}
        )
        
        # Calculate new expiry date
        current_date = datetime.now(timezone.utc)
        if current_expiry and current_expiry.get("subscription", {}).get("expiryDate"):
            expiry = current_expiry["subscription"]["expiryDate"]
            if expiry > current_date:
                current_date = expiry
        
        new_expiry = current_date + timedelta(days=duration_months * 30)
        
        # Update tenant with new subscription
        await db.tenants.update_one(
            {"_id": ObjectId(tenant_id)},
            {
                "$set": {
                    "status": "active",
                    "subscription.plan": plan_id.replace("_yearly", ""),
                    "subscription.expiryDate": new_expiry,
                    "subscription.maxUsers": plan.get("features", {}).get("maxUsers", 5),
                    "subscription.maxProducts": plan.get("features", {}).get("maxProducts", 1000),
                    "subscription.maxWarehouses": plan.get("features", {}).get("maxWarehouses", 1),
                    "subscription.maxInvoicesPerMonth": plan.get("features", {}).get("maxInvoicesPerMonth", 100),
                    "subscription.storageLimit": plan.get("features", {}).get("storageLimit", 1024),
                    "subscription.lastPayment": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                }
            }
        )
    
    return {
        "status": status_response.status,
        "payment_status": status_response.payment_status,
        "amount_total": status_response.amount_total,
        "currency": status_response.currency,
        "metadata": status_response.metadata,
        "tenant_id": transaction.get("tenantId"),
        "plan_id": transaction.get("planId")
    }


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events. Uses STRIPE_WEBHOOK_SECRET for verification."""
    from server import db
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    api_key = os.environ.get("STRIPE_API_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    kwargs = {"api_key": api_key, "webhook_url": ""}
    if webhook_secret:
        kwargs["webhook_secret"] = webhook_secret
    stripe_checkout = StripeCheckout(**kwargs)

    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")

    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process based on event type
        if webhook_response.payment_status == "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"sessionId": webhook_response.session_id},
                {
                    "$set": {
                        "status": "completed",
                        "paymentStatus": "paid",
                        "updatedAt": datetime.now(timezone.utc)
                    }
                }
            )
        
        return {"received": True}
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Stripe webhook error: %s", e)
        raise HTTPException(status_code=400, detail="Webhook verification failed")


@router.get("/tenant/{tenant_id}/history")
async def get_payment_history(tenant_id: str):
    """Get payment history for a tenant"""
    from server import db
    
    transactions = await db.payment_transactions.find(
        {"tenantId": tenant_id}
    ).sort("createdAt", -1).limit(20).to_list(length=20)
    
    result = []
    for t in transactions:
        result.append({
            "id": str(t["_id"]),
            "sessionId": t.get("sessionId"),
            "planId": t.get("planId"),
            "amount": t.get("amount"),
            "currency": t.get("currency"),
            "status": t.get("status"),
            "paymentStatus": t.get("paymentStatus"),
            "createdAt": t.get("createdAt").isoformat() if t.get("createdAt") else None
        })
    
    return result
