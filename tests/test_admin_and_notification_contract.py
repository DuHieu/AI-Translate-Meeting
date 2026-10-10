from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
API_SRC = ROOT / "apps" / "api"
WEB_SRC = ROOT / "apps" / "web" / "src"


def read_api(relative_path: str) -> str:
    return (API_SRC / relative_path).read_text(encoding="utf-8")


def read_web(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_notification_dispatcher_contract() -> None:
    source = read_api("Services/NotificationDispatcher.cs")

    assert "public interface INotificationDispatcher" in source
    assert "DispatchPaymentSuccessAsync" in source
    assert "DispatchEnterpriseLeadAsync" in source
    assert "SendTestNotificationAsync" in source
    assert "TelegramBotToken" in source
    assert "WebhookUrl" in source


def test_billing_service_exposes_account_bound_monthly_and_annual_plans() -> None:
    source = read_api("Services/BillingService.cs")

    assert '"pro"' in source
    assert "Gói LayaMeet Pro 1 Tháng" in source
    assert "99_000" in source
    assert '"pro_annual"' in source
    assert "948_000" in source
    assert "GetAccountSubscription" in source
    assert "GetAvailablePlans" in source


def test_admin_controller_contract() -> None:
    source = read_api("Controllers/AdminController.cs")

    assert '[Route("api/[controller]")]' in source
    assert '[HttpGet("metrics")]' in source
    assert '[HttpGet("orders")]' in source
    assert '[HttpGet("leads")]' in source
    assert '[HttpPost("test-notification")]' in source
    assert "X-Admin-Key" in source


def test_web_admin_dashboard_and_expanded_checkout_contract() -> None:
    api_source = read_web("api/meetingApi.ts")
    checkout_source = read_web("components/common/CheckoutModal.tsx")
    app_source = read_web("App.tsx")
    admin_page = read_web("pages/AdminDashboardPage.tsx")

    assert "getAdminMetrics" in api_source
    assert "getAdminOrders" in api_source
    assert "getAdminLeads" in api_source
    assert "testAdminNotification" in api_source

    assert "createPortal" in checkout_source
    assert "useAuth" in checkout_source
    assert "layameet:pending-checkout-plan" in checkout_source
    assert "Pro" in checkout_source
    assert "POLAR_PRODUCT_IDS" in checkout_source

    assert 'path="/admin"' in app_source
    assert "AdminDashboardPage" in app_source

    assert "LayaMeet Admin Console" in admin_page or "ViMeet Admin Console" in admin_page
    assert "Giao Dịch VietQR" in admin_page
    assert "Khách Hàng Doanh Nghiệp" in admin_page
    assert "Thông Báo Telegram" in admin_page
