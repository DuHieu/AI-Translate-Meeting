from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from polar.v2026_10.webhooks import WebhookOrderPaidPayload, WebhookCustomerStateChangedPayload

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_polar_env(monkeypatch):
    monkeypatch.setattr("app.api.polar_routes.settings.POLAR_WEBHOOK_SECRET", "mock_polar_webhook_secret_12345")


def test_checkout_missing_products_param():
    response = client.get("/checkout")
    assert response.status_code == 422


def test_checkout_creates_session_and_redirects():
    mock_checkout = MagicMock()
    mock_checkout.url = "https://polar.sh/checkout/mock-session-id"

    with patch("app.api.polar_routes.polar_client.checkouts.create", return_value=mock_checkout) as mock_create:
        response = client.get("/checkout?products=98fcb810-02e6-4819-a5ec-29f5053fec8d", follow_redirects=False)

        assert response.status_code == 303
        assert response.headers["location"] == "https://polar.sh/checkout/mock-session-id"
        mock_create.assert_called_once_with(products=["98fcb810-02e6-4819-a5ec-29f5053fec8d"])


def test_webhook_invalid_signature_returns_400():
    response = client.post(
        "/api/webhook/polar",
        content=b"{}",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 400
    assert "Invalid webhook signature" in response.json()["detail"]


def test_webhook_order_paid_event():
    mock_payload = MagicMock(spec=WebhookOrderPaidPayload)
    mock_payload.data = MagicMock(id="order_123")

    with patch("app.api.polar_routes.validate_event", return_value=mock_payload):
        response = client.post(
            "/api/webhook/polar",
            content=b'{"type":"order.paid"}',
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}


def test_webhook_customer_state_changed_event():
    mock_payload = MagicMock(spec=WebhookCustomerStateChangedPayload)
    mock_payload.data = MagicMock(id="customer_456")

    with patch("app.api.polar_routes.validate_event", return_value=mock_payload):
        response = client.post(
            "/api/webhook/polar",
            content=b'{"type":"customer.state_changed"}',
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        assert response.json() == {"status": "received"}


def test_get_checkout_url_success():
    mock_checkout = MagicMock()
    mock_checkout.url = "https://polar.sh/checkout/polar_c_123"
    mock_checkout.id = "polar_c_123"

    with patch("app.api.polar_routes.polar_client.checkouts.create", return_value=mock_checkout) as mock_create:
        response = client.get(
            "/api/polar/checkout-url?products=1b96a96a-28d8-4c57-b2f4-a406a2bfe70b&customer_email=test@example.com"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["checkout_url"] == "https://polar.sh/checkout/polar_c_123"
        assert data["session_id"] == "polar_c_123"
        mock_create.assert_called_once_with(
            products=["1b96a96a-28d8-4c57-b2f4-a406a2bfe70b"],
            customer_email="test@example.com",
        )


def test_get_polar_products_dynamic_savings():
    def make_mock_product(pid, usd_cents, vnd_amt):
        p = MagicMock()
        p.id = pid
        p.is_archived = False
        price_usd = MagicMock(price_currency="usd", price_amount=usd_cents)
        price_vnd = MagicMock(price_currency="vnd", price_amount=vnd_amt)
        p.prices = [price_usd, price_vnd]
        return p

    mock_items = [
        make_mock_product("1b96a96a-28d8-4c57-b2f4-a406a2bfe70b", 499, 99000),      # 1 month ($4.99)
        make_mock_product("75cf4cee-ef4c-49f6-84f6-ac76f9dabe02", 1349, 269000),    # 3 months ($13.49 -> ~10% off)
        make_mock_product("cb6678ec-d191-4a66-9149-9d4c51367495", 4788, 948000),    # 12 months ($47.88 -> ~20% off)
        make_mock_product("2489a64b-1af2-458e-97ae-f11babf2cf36", 7800, 1544000),   # 24 months ($78.00 -> ~35% off)
    ]
    mock_resp = MagicMock()
    mock_resp.items = mock_items

    with patch("app.api.polar_routes.polar_client.products.list", return_value=mock_resp):
        response = client.get("/api/polar/products")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 4

        # Sorted by months
        assert [p["months"] for p in data] == [1, 3, 12, 24]

        # Verify savings calculation
        assert data[0]["id"] == "pro"
        assert data[0]["savings_percent"] == 0

        assert data[1]["id"] == "pro_quarterly"
        assert data[1]["savings_percent"] == 10

        assert data[2]["id"] == "pro_annual"
        assert data[2]["savings_percent"] == 20

        assert data[3]["id"] == "pro_2year"
        assert data[3]["savings_percent"] == 35


def test_get_polar_products_handles_failure():
    with patch("app.api.polar_routes.polar_client.products.list", side_effect=Exception("API connection timeout")):
        response = client.get("/api/polar/products")
        assert response.status_code == 502
        assert "Failed to load products" in response.json()["detail"]

