import logging
from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from polar.v2026_10.webhooks import (
    PolarWebhookError,
    PolarWebhookVerificationError,
    WebhookCustomerStateChangedPayload,
    WebhookOrderPaidPayload,
    validate_event,
)
from app.config.settings import settings
from app.services.polar_service import polar_client

logger = logging.getLogger("ai_service.polar")

router = APIRouter(tags=["polar"])


@router.get("/checkout")
async def create_checkout_session(
    products: list[str] = Query(..., description="Polar product ID(s)"),
    customer_email: str | None = Query(None, description="Pre-filled customer email"),
    customer_name: str | None = Query(None, description="Customer name"),
    external_customer_id: str | None = Query(None, description="External user ID"),
):
    """Creates a Polar checkout session and redirects to the hosted checkout page."""
    product_ids: list[str] = []
    for item in products:
        for p in item.split(","):
            cleaned = p.strip()
            if cleaned:
                product_ids.append(cleaned)

    if not product_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one valid product ID must be provided",
        )

    kwargs = {"products": product_ids}
    if customer_email and customer_email.strip():
        kwargs["customer_email"] = customer_email.strip()
    if customer_name and customer_name.strip():
        kwargs["customer_name"] = customer_name.strip()
    if external_customer_id and external_customer_id.strip():
        kwargs["external_customer_id"] = external_customer_id.strip()

    try:
        checkout_session = polar_client.checkouts.create(**kwargs)
    except Exception as exc:
        logger.error(f"Failed to create Polar checkout session: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Polar checkout creation failed: {str(exc)}",
        )

    return RedirectResponse(
        url=checkout_session.url,
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.get("/api/polar/checkout-url")
async def get_checkout_url(
    products: list[str] = Query(..., description="Polar product ID(s)"),
    customer_email: str | None = Query(None, description="Pre-filled customer email"),
    customer_name: str | None = Query(None, description="Customer name"),
    external_customer_id: str | None = Query(None, description="External user ID"),
):
    """Creates a Polar checkout session and returns the checkout URL as JSON."""
    product_ids: list[str] = []
    for item in products:
        for p in item.split(","):
            cleaned = p.strip()
            if cleaned:
                product_ids.append(cleaned)

    if not product_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one valid product ID must be provided",
        )

    kwargs = {"products": product_ids}
    if customer_email and customer_email.strip():
        kwargs["customer_email"] = customer_email.strip()
    if customer_name and customer_name.strip():
        kwargs["customer_name"] = customer_name.strip()
    if external_customer_id and external_customer_id.strip():
        kwargs["external_customer_id"] = external_customer_id.strip()

    try:
        checkout_session = polar_client.checkouts.create(**kwargs)
    except Exception as exc:
        logger.error(f"Failed to create Polar checkout session: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Polar checkout creation failed: {str(exc)}",
        )

    return {
        "checkout_url": checkout_session.url,
        "session_id": checkout_session.id,
    }


@router.get("/api/polar/products")
async def get_polar_products():
    """Fetches active products from Polar API, calculates per-month rates and real discount %."""
    try:
        response = polar_client.products.list(limit=20)
        items = [p for p in response.items if not getattr(p, "is_archived", False)]
    except Exception as exc:
        logger.error(f"Failed to list Polar products: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to load products from Polar",
        )

    plan_metadata = {
        "1b96a96a-28d8-4c57-b2f4-a406a2bfe70b": {"id": "pro", "months": 1, "name": "Pro Monthly"},
        "75cf4cee-ef4c-49f6-84f6-ac76f9dabe02": {"id": "pro_quarterly", "months": 3, "name": "Pro Quarterly"},
        "cb6678ec-d191-4a66-9149-9d4c51367495": {"id": "pro_annual", "months": 12, "name": "Pro Annual"},
        "2489a64b-1af2-458e-97ae-f11babf2cf36": {"id": "pro_2year", "months": 24, "name": "Pro 2 Years"},
    }

    base_monthly_usd = 4.99
    base_monthly_vnd = 99000

    for item in items:
        meta = plan_metadata.get(item.id)
        if meta and meta["months"] == 1:
            for pr in getattr(item, "prices", []):
                curr = getattr(pr, "price_currency", "").lower()
                amt = getattr(pr, "price_amount", 0)
                if curr == "usd":
                    base_monthly_usd = amt / 100.0
                elif curr == "vnd":
                    base_monthly_vnd = amt

    parsed = []
    for item in items:
        meta = plan_metadata.get(item.id)
        if not meta:
            continue
        months = meta["months"]
        price_usd = 0.0
        price_vnd = 0
        for pr in getattr(item, "prices", []):
            curr = getattr(pr, "price_currency", "").lower()
            amt = getattr(pr, "price_amount", 0)
            if curr == "usd":
                price_usd = amt / 100.0
            elif curr == "vnd":
                price_vnd = amt

        price_per_month_usd = round(price_usd / months, 2)
        price_per_month_vnd = round(price_vnd / months)

        # Dynamic savings calculation based on Polar price difference vs 1-month plan
        savings_percent = 0
        if months > 1 and base_monthly_usd > 0:
            full_price = base_monthly_usd * months
            if full_price > price_usd:
                savings_percent = round(((full_price - price_usd) / full_price) * 100)

        parsed.append({
            "id": meta["id"],
            "polar_product_id": item.id,
            "name": meta["name"],
            "months": months,
            "price_usd": price_usd,
            "price_vnd": price_vnd,
            "price_per_month_usd": price_per_month_usd,
            "price_per_month_vnd": price_per_month_vnd,
            "savings_percent": savings_percent,
        })

    parsed.sort(key=lambda x: x["months"])
    return parsed


@router.post("/api/webhook/polar")
async def handle_polar_webhook(request: Request):
    """Verifies and handles incoming Polar webhook events."""
    secret = settings.POLAR_WEBHOOK_SECRET
    if not secret:
        logger.error("POLAR_WEBHOOK_SECRET is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Polar webhook secret is not configured",
        )

    body = await request.body()
    headers = dict(request.headers)

    try:
        event = validate_event(body=body, headers=headers, secret=secret)
    except (PolarWebhookError, PolarWebhookVerificationError, Exception) as exc:
        logger.warning(f"Polar webhook signature validation failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )

    if isinstance(event, WebhookOrderPaidPayload):
        # TODO: Handle order-paid event (e.g. provision licenses, grant customer access, activate subscription)
        logger.info(f"Polar webhook received order.paid: order_id={event.data.id}")
    elif isinstance(event, WebhookCustomerStateChangedPayload):
        # TODO: Handle customer-state-changed event (e.g. sync entitlements, lock/unlock customer features)
        logger.info(
            f"Polar webhook received customer.state_changed: customer_id={event.data.id}"
        )
    else:
        logger.info(f"Polar webhook received unhandled event type: {getattr(event, 'type', 'unknown')}")

    return {"status": "received"}
