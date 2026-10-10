# Polar Payments Integration (layameet)

> **Important**: This integration connects directly to Polar's **Production** environment (`POLAR_SERVER=production`) under organization `layameet` (`id: 2539aa00-4b74-478b-adf9-be9f264f4675`).

---

## 1. Overview & Architecture

Polar is integrated into the backend AI Service (`apps/ai-service`, FastAPI) using the official `polar-sdk` package. The architecture provides:
1. **Hosted Checkout Redirection (`GET /checkout?products=<id>`)**: Creates a checkout session via the Polar SDK and 303-redirects the user to the Polar-hosted payment checkout page.
2. **Cryptographic Webhook Ingestion (`POST /api/webhook/polar`)**: Validates standard webhook signatures against `POLAR_WEBHOOK_SECRET` before dispatching `order.paid` and `customer.state_changed` event hooks.
3. **Zero-Code Customer Portal**: Polar natively hosts and emails the customer portal link upon checkout, requiring no custom application code for subscription/invoice management.

---

## 2. Provisioned Resources

| Resource | ID / URL | Description |
|---|---|---|
| **Organization** | `2539aa00-4b74-478b-adf9-be9f264f4675` | Organization slug: `layameet` |
| **Pro Monthly** | `1b96a96a-28d8-4c57-b2f4-a406a2bfe70b` | $4.99 USD / 99,000 VND (1 month) |
| **Pro Quarterly** | `75cf4cee-ef4c-49f6-84f6-ac76f9dabe02` | $13.49 USD / 269,000 VND (3 months, save 10%) |
| **Pro Annual** | `cb6678ec-d191-4a66-9149-9d4c51367495` | $47.88 USD / 948,000 VND (1 year, save 20%) |
| **Pro 2 Years** | `2489a64b-1af2-458e-97ae-f11babf2cf36` | $78.00 USD / 1,544,000 VND (2 years, save 35%) |
| **Webhook Endpoint** | `16085cc5-7301-4b37-9784-b95d5819e5d9` | Target URL: `https://layameet.com/api/webhook/polar` |
| **Webhook Events** | `order.paid`, `order.created`, `customer.state_changed` | Standard Raw Format |

---

## 3. Environment Variables

Only variable names are documented. Values must remain strictly in `.env` and secret stores.

- `POLAR_ACCESS_TOKEN`: Polar Organization Personal Access Token (scopes: `products`, `checkouts`, `webhooks`).
- `POLAR_WEBHOOK_SECRET`: Secret key for validating incoming webhook payloads (auto-provisioned).
- `POLAR_SERVER`: Environment selector (`production` or `sandbox`).

---

## 4. Files Created & Modified

### Created
- `apps/ai-service/app/services/polar_service.py`: Singleton SDK client constructor reading from `POLAR_SERVER`.
- `apps/ai-service/app/api/polar_routes.py`: FastAPI route handlers for `/checkout`, `/api/polar/checkout-url`, `/api/polar/products`, and `/api/webhook/polar`.
- `apps/ai-service/tests/test_polar_routes.py`: Unit test suite verifying redirect handling, JSON checkout session generation, dynamic discount calculation, and webhook signature verification.
- `POLAR_SETUP.md`: This integration and handover documentation.

### Modified
- `apps/ai-service/requirements.txt`: Added `polar-sdk>=1.0.0` and `python-dotenv>=1.0.0`.
- `apps/ai-service/app/config/settings.py`: Added Polar configuration fields and `.env` loader.
- `apps/ai-service/app/main.py`: Included `polar_router`.
- `apps/web/src/api/meetingApi.ts`: Added Polar types, `getPolarProducts()`, and `getPolarCheckoutUrl()`.
- `apps/web/src/components/common/CheckoutModal.tsx`: Complete overhaul removing VietQR, loading dynamic products & savings from Polar, enterprise order breakdown, and direct checkout redirect.
- `apps/web/vite.config.ts` & `apps/web/nginx.conf`: Configured reverse proxy rules for `/checkout`, `/api/polar/`, and `/api/webhook/polar` to AI Service.
- `.env`, `.env.example`, `.env.production.example`: Added Polar configuration variables.

---

## 5. Verification & Testing

### Running the Test Suite
```bash
python -m pytest apps/ai-service/tests/test_polar_routes.py -v
```

### Dev Server Command
To start the AI Service locally with Polar routes:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir apps/ai-service --reload
```

### Checkout Testing Link
- Local test link:
  ```
  http://localhost:8000/checkout?products=98fcb810-02e6-4819-a5ec-29f5053fec8d
  ```
- To test end-to-end without incurring a real charge, create a 100% discount code in your Polar Dashboard under [Discounts](https://polar.sh/dashboard/layameet/discounts) (e.g., code `TEST100`) and apply it at checkout.

---

## 6. Pre-Merge Checklist

- [x] `.env` is listed in `.gitignore` and has not been committed.
- [x] Secrets are isolated and never printed or committed.
- [x] Polar SDK client is a singleton and dynamically switches environments based on `POLAR_SERVER`.
- [x] Webhook route verifies signatures using standard `validate_event`.
- [x] All automated tests pass (`test_polar_routes.py` and overall test suites).
