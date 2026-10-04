from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_SRC = ROOT / "apps" / "web" / "src"


def read(relative_path: str) -> str:
    return (WEB_SRC / relative_path).read_text(encoding="utf-8")


def test_billing_api_exposes_payment_order_contract() -> None:
    source = read("api/meetingApi.ts")

    assert "export interface PaymentOrderResponse" in source
    for field in (
        "orderCode: string",
        "amount: number",
        "planName: string",
        "status: string",
        "qrUrl: string",
        "bankId: string",
        "accountNumber: string",
        "accountName: string",
        "createdAt: string",
    ):
        assert field in source

    assert "async createPaymentOrder(" in source
    assert "Promise<PaymentOrderResponse>" in source
    assert "/api/billing/create-order" in source
    assert "async getPaymentOrder(orderCode: string)" in source
    assert "/api/billing/order/${encodeURIComponent(orderCode.trim())}" in source


def test_checkout_modal_supports_vietqr_and_pending_order_polling() -> None:
    source = read("components/common/CheckoutModal.tsx")

    for prop in (
        "isOpen: boolean",
        "onClose: () => void",
        "meetingCode?: string",
        "initialPlanId?: string",
        "onPaymentSuccess?: () => void",
    ):
        assert prop in source

    assert "meetingApi.createPaymentOrder" in source
    assert "meetingApi.getPaymentOrder" in source
    assert "2_500" in source
    assert "order.status.toLowerCase() !== 'pending'" in source
    assert "latest.status.toLowerCase() === 'paid'" in source
    assert "onPaymentSuccess?.()" in source
    assert "Thanh toán thành công! Gói Pro đã được kích hoạt" in source
    assert "src={order.qrUrl}" in source
    for label in (
        "Ngân hàng",
        "Số tài khoản",
        "Chủ tài khoản",
        "Số tiền",
        "Nội dung chuyển khoản",
    ):
        assert label in source
    assert "navigator.clipboard.writeText" in source
    assert "99.000đ / tháng" in source
    assert "Gói LayaMeet Pro 1 Tháng" in source


def test_checkout_modal_is_wired_into_meeting_and_pricing() -> None:
    meeting_shell = read("components/meeting/MeetingShell.tsx")
    pricing_section = read("components/home/PricingSection.tsx")

    assert "import { CheckoutModal }" in meeting_shell
    assert "<CheckoutModal" in meeting_shell
    assert "meetingCode={session.meetingCode}" in meeting_shell
    assert "initialPlanId=\"pro\"" in meeting_shell
    assert "setIsProPlan(true)" in meeting_shell
    assert "setTimeRemainingSeconds(null)" in meeting_shell
    assert "onPaymentSuccess={handlePaymentSuccess}" in meeting_shell

    assert "import { CheckoutModal }" in pricing_section
    assert "tier.id === 'pro'" in pricing_section
    assert "setIsCheckoutOpen(true)" in pricing_section
    assert "<CheckoutModal" in pricing_section
    assert "initialPlanId=\"pro\"" in pricing_section
