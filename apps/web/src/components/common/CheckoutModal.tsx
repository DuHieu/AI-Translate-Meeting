import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { meetingApi, PaymentOrderResponse, PolarProductPlan } from '../../api/meetingApi';
import { useAuth } from '../../context/auth-context-def';
import { useLanguage } from '../../context/language-context-def';
import { scrollLock } from '../../utils/scrollLock';

const PENDING_CHECKOUT_PLAN_KEY = 'layameet:pending-checkout-plan';
const PAYMENT_ORDER_ERROR = '__PAYMENT_ORDER_FAILED__';

type BillingPlanId = 'pro' | 'pro_quarterly' | 'pro_annual' | 'pro_2year';

const POLAR_PRODUCT_IDS: Record<BillingPlanId, string> = {
  pro: '1b96a96a-28d8-4c57-b2f4-a406a2bfe70b',
  pro_quarterly: '75cf4cee-ef4c-49f6-84f6-ac76f9dabe02',
  pro_annual: 'cb6678ec-d191-4a66-9149-9d4c51367495',
  pro_2year: '2489a64b-1af2-458e-97ae-f11babf2cf36',
};

interface PlanDisplayItem {
  id: BillingPlanId;
  polarProductId: string;
  name: string;
  months: number;
  priceUsd: number;
  priceVnd: number;
  pricePerMonthUsd: number;
  pricePerMonthVnd: number;
  savingsPercent: number;
  isPopular?: boolean;
}

const DEFAULT_PLANS: PlanDisplayItem[] = [
  {
    id: 'pro',
    polarProductId: POLAR_PRODUCT_IDS.pro,
    name: 'Pro 1 Tháng',
    months: 1,
    priceUsd: 4.99,
    priceVnd: 99000,
    pricePerMonthUsd: 4.99,
    pricePerMonthVnd: 99000,
    savingsPercent: 0,
  },
  {
    id: 'pro_quarterly',
    polarProductId: POLAR_PRODUCT_IDS.pro_quarterly,
    name: 'Pro 1 Quý',
    months: 3,
    priceUsd: 13.49,
    priceVnd: 269000,
    pricePerMonthUsd: 4.50,
    pricePerMonthVnd: 89667,
    savingsPercent: 10,
  },
  {
    id: 'pro_annual',
    polarProductId: POLAR_PRODUCT_IDS.pro_annual,
    name: 'Pro 1 Năm',
    months: 12,
    priceUsd: 47.88,
    priceVnd: 948000,
    pricePerMonthUsd: 3.99,
    pricePerMonthVnd: 79000,
    savingsPercent: 20,
    isPopular: true,
  },
  {
    id: 'pro_2year',
    polarProductId: POLAR_PRODUCT_IDS.pro_2year,
    name: 'Pro 2 Năm',
    months: 24,
    priceUsd: 78.00,
    priceVnd: 1544000,
    pricePerMonthUsd: 3.25,
    pricePerMonthVnd: 64333,
    savingsPercent: 35,
  },
];

interface CheckoutCopy {
  close: string;
  title: string;
  subtitle: string;
  steps: string[];
  checkingAccount: string;
  gateTitle: string;
  gateBody: string;
  selectedPlan: string;
  signIn: string;
  signInError: string;
  accountBoundNotice: string;
  chooseCycle: string;
  savePercent: (pct: number) => string;
  popularBadge: string;
  billedPeriod: (months: number, usd: number, vnd: number) => string;
  perMonth: string;
  orderSummaryTitle: string;
  serviceName: string;
  serviceDesc: string;
  billingDuration: string;
  subtotal: string;
  taxVat: string;
  taxIncluded: string;
  totalDue: string;
  ctaButton: (usd: number) => string;
  processingSession: string;
  waitingPayment: string;
  securityGuarantee: string;
  invoiceNotice: string;
  paidTitle: string;
  paidBody: string;
  expiresOn: string;
  done: string;
  paymentPolicyLink: string;
  refundPolicyLink: string;
  supportEmail: string;
  retry: string;
  orderError: string;
}

const CHECKOUT_COPY: Record<string, CheckoutCopy> = {
  vi: {
    close: 'Đóng thanh toán',
    title: 'Nâng cấp LayaMeet Pro',
    subtitle: 'Thanh toán trực tiếp qua cổng Polar (Merchant of Record quốc tế)',
    steps: ['1. Tài khoản', '2. Chọn gói & Thanh toán', '3. Kích hoạt'],
    checkingAccount: 'Đang xác thực thông tin tài khoản…',
    gateTitle: 'Yêu cầu đăng nhập tài khoản Google',
    gateBody:
      'Gói bản quyền LayaMeet Pro sẽ được gắn trực tiếp vào tài khoản Google của bạn để đồng bộ quyền Host, thời lượng không giới hạn và các tính năng AI trên mọi thiết bị.',
    selectedPlan: 'Gói dịch vụ đã chọn',
    signIn: 'Đăng nhập Google để tiếp tục',
    signInError: 'Không thể khởi động đăng nhập Google. Vui lòng thử lại.',
    accountBoundNotice: 'Bản quyền Pro sẽ được kích hoạt cho tài khoản này',
    chooseCycle: 'Chọn thời hạn đăng ký',
    savePercent: (pct) => `Tiết kiệm ${pct}%`,
    popularBadge: 'Được chọn nhiều nhất',
    billedPeriod: (months, usd, vnd) =>
      `Thanh toán $${usd.toFixed(2)} USD (~${vnd.toLocaleString('vi-VN')}đ) / ${months} tháng`,
    perMonth: '/ tháng',
    orderSummaryTitle: 'Tóm tắt đơn hàng',
    serviceName: 'LayaMeet Pro Unlimited Host',
    serviceDesc: 'Không giới hạn thời lượng họp · Dịch thuật AI song song · Ghi biên bản tự động',
    billingDuration: 'Thời hạn bản quyền',
    subtotal: 'Giá gói',
    taxVat: 'Thuế & Phí giao dịch',
    taxIncluded: 'Đã bao gồm thuế (Polar MoR)',
    totalDue: 'Tổng số tiền thanh toán',
    ctaButton: (usd) => `Tiếp tục thanh toán $${usd.toFixed(2)} USD`,
    processingSession: 'Đang khởi tạo cổng thanh toán bảo mật…',
    waitingPayment: 'Đang chờ xác nhận giao dịch · Hệ thống tự động kích hoạt tài khoản ngay khi hoàn tất',
    securityGuarantee: 'Bảo mật SSL 256-bit · Tiêu chuẩn PCI-DSS Level 1 · Cổng thanh toán quốc tế Polar',
    invoiceNotice: 'Hóa đơn điện tử (VAT/Receipt) sẽ được tự động gửi vào email của bạn ngay sau khi thanh toán.',
    paidTitle: 'Bản quyền Pro đã kích hoạt thành công',
    paidBody: 'đã được nâng cấp thành công lên gói Pro. Bạn có thể sử dụng đầy đủ quyền hạn ngay bây giờ.',
    expiresOn: 'Thời hạn đến',
    done: 'Hoàn tất & Vào phòng họp',
    paymentPolicyLink: 'Chính sách thanh toán',
    refundPolicyLink: 'Chính sách hoàn tiền',
    supportEmail: 'Hỗ trợ: support@layameet.com',
    retry: 'Thử lại phiên thanh toán',
    orderError: 'Không thể tạo phiên thanh toán. Vui lòng thử lại.',
  },
  en: {
    close: 'Close checkout',
    title: 'Upgrade to LayaMeet Pro',
    subtitle: 'Secure checkout powered by Polar (Merchant of Record)',
    steps: ['1. Account', '2. Plan & Billing', '3. Activated'],
    checkingAccount: 'Verifying account details…',
    gateTitle: 'Google Account Required',
    gateBody:
      'LayaMeet Pro licenses are bound directly to your Google account to synchronize host privileges, unlimited meeting limits, and AI translation tokens across all devices.',
    selectedPlan: 'Selected Plan',
    signIn: 'Sign in with Google to continue',
    signInError: 'Could not complete Google sign in. Please try again.',
    accountBoundNotice: 'Pro license will be assigned to this account',
    chooseCycle: 'Select billing cycle',
    savePercent: (pct) => `Save ${pct}%`,
    popularBadge: 'Most Popular',
    billedPeriod: (months, usd, vnd) =>
      `Billed $${usd.toFixed(2)} USD (~${vnd.toLocaleString('vi-VN')} VND) for ${months} months`,
    perMonth: '/ month',
    orderSummaryTitle: 'Order Summary',
    serviceName: 'LayaMeet Pro Unlimited Host',
    serviceDesc: 'Unlimited meeting duration · Real-time AI dual subtitles · Auto meeting minutes',
    billingDuration: 'Subscription Period',
    subtotal: 'Plan Price',
    taxVat: 'Taxes & Fees',
    taxIncluded: 'Included (Polar MoR)',
    totalDue: 'Total Amount',
    ctaButton: (usd) => `Proceed to Secure Checkout ($${usd.toFixed(2)} USD)`,
    processingSession: 'Initializing secure checkout session…',
    waitingPayment: 'Waiting for payment confirmation · Account activates automatically upon receipt',
    securityGuarantee: '256-bit SSL · PCI-DSS Level 1 Compliant · Powered by Polar MoR',
    invoiceNotice: 'An electronic invoice and receipt will be emailed immediately after purchase.',
    paidTitle: 'Pro Unlimited is Now Active',
    paidBody: 'has been upgraded to Pro. You can now host unlimited meetings and use Pro features.',
    expiresOn: 'Expires on',
    done: 'Done & Return to Meeting',
    paymentPolicyLink: 'Payment Policy',
    refundPolicyLink: 'Refund Policy',
    supportEmail: 'Support: support@layameet.com',
    retry: 'Retry payment session',
    orderError: 'Could not initialize checkout. Please try again.',
  },
  ja: {
    close: '決済画面を閉じる',
    title: 'LayaMeet Proへアップグレード',
    subtitle: 'Polar（国際Merchant of Record）による安全なオンライン決済',
    steps: ['1. アカウント', '2. プラン選択・決済', '3. 有効化完了'],
    checkingAccount: 'アカウント情報を確認しています…',
    gateTitle: 'Googleアカウントへのログインが必要です',
    gateBody:
      'LayaMeet Proのライセンスはお客様のGoogleアカウントに紐づき、ホスト権限、無制限の会議時間、AI翻訳機能をすべての端末で同期します。',
    selectedPlan: '選択されたプラン',
    signIn: 'Googleでログインして続行',
    signInError: 'Googleログインに失敗しました。再度お試しください。',
    accountBoundNotice: 'Proライセンスはこのアカウントに付与されます',
    chooseCycle: '請求サイクルを選択',
    savePercent: (pct) => `${pct}% お得`,
    popularBadge: '人気プラン',
    billedPeriod: (months, usd, vnd) =>
      `${months}ヶ月分を一括請求: $${usd.toFixed(2)} USD (~${vnd.toLocaleString('vi-VN')} VND)`,
    perMonth: '/ 月',
    orderSummaryTitle: '注文内容の確認',
    serviceName: 'LayaMeet Pro Unlimited Host',
    serviceDesc: '会議時間無制限 · リアルタイム双方向AI字幕翻訳 · 議事録自動生成',
    billingDuration: '有効期間',
    subtotal: 'プラン料金',
    taxVat: '税金・手数料',
    taxIncluded: '税込 (Polar MoR)',
    totalDue: '合計金額',
    ctaButton: (usd) => `安全な決済画面へ進む ($${usd.toFixed(2)} USD)`,
    processingSession: '安全な決済セッションを準備しています…',
    waitingPayment: '決済完了を待機中 · 完了次第、自動的にPro権限が有効化されます',
    securityGuarantee: '256ビットSSL暗号化 · PCI-DSS Level 1準拠 · Polar MoR',
    invoiceNotice: '電子領収書およびインボイスは決済完了後すぐにメールで送付されます。',
    paidTitle: 'Proライセンスが有効になりました',
    paidBody: 'のProアップグレードが完了しました。すべてのPro機能をご利用いただけます。',
    expiresOn: '有効期限',
    done: '完了して会議に戻る',
    paymentPolicyLink: '決済ポリシー',
    refundPolicyLink: '返金ポリシー',
    supportEmail: 'サポート: support@layameet.com',
    retry: '決済セッションを再試行',
    orderError: '決済セッションを作成できませんでした。もう一度お試しください。',
  },
};

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingCode?: string;
  initialPlanId?: string;
  onPaymentSuccess?: () => void;
}

function normalizePlanId(planId?: string): BillingPlanId {
  if (planId === 'pro_2year' || planId === '2year' || planId === 'pro_biennial' || planId === 'biennial') {
    return 'pro_2year';
  }
  if (planId === 'pro_quarterly' || planId === 'quarterly' || planId === '3month' || planId === 'pro_3month') {
    return 'pro_quarterly';
  }
  return planId === 'pro_annual' || planId === 'annual' ? 'pro_annual' : 'pro';
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  meetingCode,
  initialPlanId = 'pro',
  onPaymentSuccess,
}) => {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { language } = useLanguage();
  const copy = CHECKOUT_COPY[language] || CHECKOUT_COPY.vi;

  const [plans, setPlans] = useState<PlanDisplayItem[]>(DEFAULT_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<BillingPlanId>(
    normalizePlanId(initialPlanId),
  );
  const [order, setOrder] = useState<PaymentOrderResponse | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);
  const lastAutoRequestRef = useRef<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const clearPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Fetch real-time products and dynamic savings calculations directly from Polar
  useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;

    async function loadPolarCatalog() {
      try {
        const polarPlans: PolarProductPlan[] = await meetingApi.getPolarProducts();
        if (!isSubscribed || !Array.isArray(polarPlans) || polarPlans.length === 0) return;

        const mapped: PlanDisplayItem[] = polarPlans.map((p) => ({
          id: p.id,
          polarProductId: p.polar_product_id,
          name: p.name,
          months: p.months,
          priceUsd: p.price_usd,
          priceVnd: p.price_vnd,
          pricePerMonthUsd: p.price_per_month_usd,
          pricePerMonthVnd: p.price_per_month_vnd,
          savingsPercent: p.savings_percent,
          isPopular: p.id === 'pro_annual',
        }));

        setPlans(mapped);
      } catch {
        // Keeps DEFAULT_PLANS fallback silently if offline
      }
    }

    void loadPolarCatalog();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  const fetchCheckoutSession = useCallback(
    async (planId: BillingPlanId) => {
      if (!user?.email) return;

      const requestId = ++requestSequenceRef.current;
      setIsLoading(true);
      setIsPaid(false);
      setError(null);
      clearPolling();

      const activePlan = plans.find((p) => p.id === planId) || DEFAULT_PLANS.find((p) => p.id === planId);
      const productId = activePlan?.polarProductId || POLAR_PRODUCT_IDS[planId];
      const fallbackUrl = `/checkout?products=${productId}&customer_email=${encodeURIComponent(user.email)}`;

      try {
        let liveUrl = fallbackUrl;
        try {
          const polarSession = await meetingApi.getPolarCheckoutUrl(
            productId,
            user.email,
            user.fullName,
            user.id,
          );
          if (polarSession?.checkout_url) {
            liveUrl = polarSession.checkout_url;
          }
        } catch {
          // In case JSON endpoint is slow, fallbackUrl will direct 303 via /checkout
        }

        if (requestId === requestSequenceRef.current) {
          setCheckoutUrl(liveUrl);
        }

        // Register order tracking with .NET backend for status audit & polling
        const newOrder = await meetingApi.createPaymentOrder(
          planId,
          meetingCode,
          user.email,
          user.fullName,
          user.id,
          'polar',
          'USD',
        );

        if (requestId === requestSequenceRef.current) {
          newOrder.checkoutUrl = liveUrl;
          newOrder.paymentMethod = 'polar';
          setOrder(newOrder);
        }
      } catch (requestError) {
        if (requestId === requestSequenceRef.current) {
          setError(requestError instanceof Error ? requestError.message : PAYMENT_ORDER_ERROR);
        }
      } finally {
        if (requestId === requestSequenceRef.current) {
          setIsLoading(false);
        }
      }
    },
    [clearPolling, meetingCode, plans, user?.email, user?.fullName, user?.id],
  );

  useEffect(() => {
    if (!isOpen) {
      requestSequenceRef.current += 1;
      lastAutoRequestRef.current = null;
      clearPolling();
      setOrder(null);
      setCheckoutUrl(null);
      setIsPaid(false);
      setError(null);
      return;
    }

    const initialPlan = normalizePlanId(initialPlanId);
    setSelectedPlanId(initialPlan);

    if (!user?.email) {
      setIsLoading(false);
      setOrder(null);
      return;
    }

    const requestKey = `${user.id}:${initialPlan}:${meetingCode || ''}`;
    if (lastAutoRequestRef.current === requestKey) return;
    lastAutoRequestRef.current = requestKey;
    void fetchCheckoutSession(initialPlan);
  }, [clearPolling, fetchCheckoutSession, initialPlanId, isOpen, meetingCode, user?.email, user?.id]);

  const orderCode = order?.orderCode;

  // Real-time polling: check order status and account subscription
  useEffect(() => {
    if (!isOpen || isPaid || !user?.email) return undefined;

    pollingRef.current = window.setInterval(async () => {
      try {
        if (orderCode) {
          const latest = await meetingApi.getPaymentOrder(orderCode);
          if (latest.status.toLowerCase() === 'paid') {
            setOrder(latest);
            setIsPaid(true);
            clearPolling();
            onPaymentSuccess?.();
            return;
          }
        }

        const sub = await meetingApi.getAccountSubscription(user.email);
        if (sub.isPro) {
          setIsPaid(true);
          clearPolling();
          onPaymentSuccess?.();
        }
      } catch {
        // Continue polling; non-blocking
      }
    }, 2_500);

    return clearPolling;
  }, [clearPolling, isOpen, isPaid, onPaymentSuccess, orderCode, user?.email]);

  // Modal accessibility: Escape, tab trap, scroll lock
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement as HTMLElement | null;
    const releaseScrollLock = scrollLock.lock();
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      releaseScrollLock();
      previousFocus?.focus();
    };
  }, [isOpen]);

  const handlePlanChange = (planId: BillingPlanId) => {
    if (planId === selectedPlanId) return;
    setSelectedPlanId(planId);
    lastAutoRequestRef.current = `${user?.id || ''}:${planId}:${meetingCode || ''}`;
    if (user?.email) void fetchCheckoutSession(planId);
  };

  const handleSignIn = async () => {
    setError(null);
    try {
      window.sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, selectedPlanId);
      await signInWithGoogle(`${window.location.pathname}${window.location.search}#pricing`);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : copy.signInError);
    }
  };

  const formatExpiry = (value?: string | null) => {
    if (!value) return '—';
    const locale = language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'vi-VN';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value));
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const activeStep = !user ? 1 : isPaid ? 3 : 2;
  const currentPlan = plans.find((p) => p.id === selectedPlanId) || DEFAULT_PLANS[0];

  const currentCheckoutUrl =
    checkoutUrl ||
    order?.checkoutUrl ||
    `/checkout?products=${currentPlan.polarProductId}&customer_email=${encodeURIComponent(user?.email || '')}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      style={{
        top: 'var(--viewport-top)',
        height: 'var(--app-height)',
        bottom: 'auto',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative max-h-[calc(var(--app-height)-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl"
      >
        {/* Dismiss Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute right-3.5 top-3.5 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <header className="border-b border-zinc-800/80 px-6 pb-5 pt-6 sm:px-8">
          <div className="pr-10">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md bg-blue-500/10 px-2 text-[11px] font-semibold text-blue-400 border border-blue-500/20">
                LayaMeet Official
              </span>
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Lock className="h-3 w-3 text-emerald-400" /> PCI-DSS Level 1
              </span>
            </div>
            <h2 id="checkout-title" className="mt-2 text-xl font-bold tracking-tight text-white">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">{copy.subtitle}</p>
          </div>

          {/* Stepper Progress */}
          <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Checkout progress">
            {copy.steps.map((step: string, index: number) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === activeStep;
              const isComplete = stepNumber < activeStep;
              return (
                <li
                  key={step}
                  aria-current={isActive ? 'step' : undefined}
                  className={`overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition ${
                    isActive
                      ? 'border-blue-500/80 bg-blue-500/10 text-blue-300 font-semibold'
                      : isComplete
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
                  }`}
                >
                  {step}
                </li>
              );
            })}
          </ol>
        </header>

        {/* Modal Main Content */}
        <main className="p-6 sm:p-8">
          {authLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-zinc-400" aria-busy="true">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="mt-3 text-sm">{copy.checkingAccount}</p>
            </div>
          ) : !user?.email ? (
            /* Step 1: Sign in required */
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <UserCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{copy.gateTitle}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{copy.gateBody}</p>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    {copy.selectedPlan}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{currentPlan.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-base font-bold text-white">
                    ${currentPlan.priceUsd.toFixed(2)} USD
                  </p>
                  <p className="text-[11px] text-zinc-400">~{currentPlan.priceVnd.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>

              {error && (
                <p role="alert" className="mt-4 text-xs text-red-400">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>{copy.signIn}</span>
              </button>
            </section>
          ) : isPaid ? (
            /* Step 3: Success & Activated */
            <section
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-7 text-center"
              role="status"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-emerald-300">{copy.paidTitle}</h3>
              <p className="mt-2 text-xs text-zinc-300">
                Tài khoản <strong className="text-white">{user.email}</strong> {copy.paidBody}
              </p>
              <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-xs text-zinc-300">
                <FileText className="h-4 w-4 text-emerald-400" />
                <span>
                  {copy.expiresOn}:{' '}
                  <strong className="text-white">{formatExpiry(order?.subscriptionExpiresAt)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 min-h-11 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer"
              >
                {copy.done}
              </button>
            </section>
          ) : (
            /* Step 2: Plan Selection & Order Summary */
            <section className="space-y-6">
              {/* Account Binding Confirmation Bar */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover border border-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {(user.fullName || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{user.fullName}</p>
                    <p className="truncate text-[11px] text-zinc-400">{user.email}</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3 w-3" /> {copy.accountBoundNotice}
                </span>
              </div>

              {/* Cycle Options Grid */}
              <div>
                <p className="text-xs font-medium text-zinc-300 mb-2.5">{copy.chooseCycle}</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {plans.map((plan) => {
                    const isSelected = plan.id === selectedPlanId;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => handlePlanChange(plan.id)}
                        className={`relative rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40'
                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900'
                        }`}
                      >
                        {/* Dynamic Savings Badge or Popular Badge */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-xs font-bold text-white">{plan.name}</span>
                          {plan.savingsPercent > 0 ? (
                            <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                              {copy.savePercent(plan.savingsPercent)}
                            </span>
                          ) : null}
                        </div>

                        {/* Price per month */}
                        <div className="mt-2">
                          <span className="font-mono text-base font-bold text-white">
                            ${plan.pricePerMonthUsd.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-zinc-400 ml-1">{copy.perMonth}</span>
                        </div>

                        {/* Billed duration subtitle */}
                        <p className="mt-1.5 text-[10px] text-zinc-400 leading-tight">
                          {copy.billedPeriod(plan.months, plan.priceUsd, plan.priceVnd)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary Breakdown Card (Credible & Transparent) */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="border-b border-zinc-800/80 pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {copy.orderSummaryTitle}
                  </h4>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{currentPlan.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{copy.serviceDesc}</p>
                    </div>
                    <span className="text-right font-mono text-sm font-bold text-white shrink-0">
                      ${currentPlan.priceUsd.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Subtotal line items */}
                <div className="py-3.5 space-y-2 text-xs border-b border-zinc-800/80">
                  <div className="flex justify-between text-zinc-400">
                    <span>{copy.billingDuration}</span>
                    <span className="font-medium text-zinc-200">{currentPlan.months} tháng</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>{copy.subtotal}</span>
                    <span className="font-mono font-medium text-zinc-200">
                      ${currentPlan.priceUsd.toFixed(2)} USD (~{currentPlan.priceVnd.toLocaleString('vi-VN')} VND)
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>{copy.taxVat}</span>
                    <span className="text-emerald-400 font-medium">{copy.taxIncluded}</span>
                  </div>
                </div>

                {/* Total Line */}
                <div className="pt-3.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300">{copy.totalDue}</span>
                  <div className="text-right">
                    <span className="font-mono text-xl font-bold text-white">
                      ${currentPlan.priceUsd.toFixed(2)} USD
                    </span>
                    <p className="text-[11px] text-zinc-400">~{currentPlan.priceVnd.toLocaleString('vi-VN')} VND</p>
                  </div>
                </div>

                {/* Accepted Payment Brands */}
                <div className="mt-4 pt-3.5 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Thanh toán chấp nhận:</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-300">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 border border-zinc-700">Visa</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 border border-zinc-700">Mastercard</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 border border-zinc-700">Apple Pay</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 border border-zinc-700">Google Pay</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 border border-zinc-700">JCB</span>
                  </div>
                </div>

                {/* Action CTA & State */}
                <div className="mt-5 space-y-3">
                  {error ? (
                    <div role="alert" className="rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-center">
                      <p className="text-xs text-red-300">
                        {error === PAYMENT_ORDER_ERROR ? copy.orderError : error}
                      </p>
                      <button
                        type="button"
                        onClick={() => void fetchCheckoutSession(selectedPlanId)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/30 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> {copy.retry}
                      </button>
                    </div>
                  ) : isLoading ? (
                    <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-800 text-xs text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span>{copy.processingSession}</span>
                    </div>
                  ) : (
                    <>
                      <a
                        href={currentCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>{copy.ctaButton(currentPlan.priceUsd)}</span>
                        <ExternalLink className="h-3.5 w-3.5 ml-0.5 opacity-80" />
                      </a>
                      <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400" role="status">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        <span>{copy.waitingPayment}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Invoice Reassurance */}
                <p className="mt-3 text-[11px] leading-relaxed text-zinc-400 text-center">
                  {copy.invoiceNotice}
                </p>
              </div>
            </section>
          )}
        </main>

        {/* Modal Footer with Compliance Links */}
        <footer className="border-t border-zinc-800/80 px-6 py-3.5 sm:px-8 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{copy.securityGuarantee}</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/payment-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-200 underline-offset-2 hover:underline"
            >
              {copy.paymentPolicyLink}
            </a>
            <span>·</span>
            <a
              href="/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-200 underline-offset-2 hover:underline"
            >
              {copy.refundPolicyLink}
            </a>
            <span>·</span>
            <span className="text-zinc-400">{copy.supportEmail}</span>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
