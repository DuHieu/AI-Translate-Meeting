import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
  Info,
} from 'lucide-react';
import { meetingApi, PaymentOrderResponse, PolarProductPlan } from '../../api/meetingApi';
import { useAuth } from '../../context/auth-context-def';
import { useLanguage } from '../../context/language-context-def';
import { scrollLock } from '../../utils/scrollLock';
import { LayaMeetLogo } from './LayaMeetLogo';
import {
  VisaIcon,
  MastercardIcon,
  JcbIcon,
  AmexIcon,
  DiscoverIcon,
  UnionPayIcon,
  ApplePayIcon,
  GooglePayIcon,
} from './PaymentMethodIcons';

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
  subscriptionDetailsTitle: string;
  orderSummaryTitle: string;
  paymentMethodTitle: string;
  dueToday: string;
  subtotal: string;
  taxVat: string;
  taxIncluded: string;
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

const CHECKOUT_I18N: Record<string, CheckoutCopy> = {
  vi: {
    close: 'Đóng thanh toán',
    title: 'Nâng cấp LayaMeet Pro',
    subtitle: 'Thanh toán bảo mật chuẩn quốc tế qua cổng Polar (Merchant of Record)',
    steps: ['1. Tài khoản', '2. Gói & Thanh toán', '3. Kích hoạt'],
    checkingAccount: 'Đang xác thực thông tin tài khoản…',
    gateTitle: 'Yêu cầu tài khoản Google',
    gateBody:
      'Bản quyền LayaMeet Pro được liên kết trực tiếp vào tài khoản Google của bạn để đồng bộ quyền Host, thời lượng họp không giới hạn và các tính năng AI trên mọi thiết bị.',
    selectedPlan: 'Gói đã chọn',
    signIn: 'Đăng nhập Google để tiếp tục',
    signInError: 'Không thể đăng nhập Google. Vui lòng thử lại.',
    accountBoundNotice: 'Bản quyền sẽ được kích hoạt cho tài khoản này',
    chooseCycle: 'Chọn thời hạn bản quyền',
    savePercent: (pct) => `Tiết kiệm ${pct}%`,
    popularBadge: 'Được chọn nhiều nhất',
    billedPeriod: (months, usd, vnd) =>
      `Thanh toán $${usd.toFixed(2)} USD (~${vnd.toLocaleString('vi-VN')}đ) / ${months} tháng`,
    perMonth: '/ tháng',
    subscriptionDetailsTitle: 'Thông tin gói đăng ký',
    orderSummaryTitle: 'Tóm tắt đơn hàng',
    paymentMethodTitle: 'Phương thức thanh toán',
    dueToday: 'Thanh toán ngay hôm nay',
    subtotal: 'Giá gói',
    taxVat: 'Thuế & Phí dịch vụ',
    taxIncluded: 'Đã bao gồm thuế (Polar MoR)',
    ctaButton: (usd) => `Tiến hành thanh toán $${usd.toFixed(2)} USD`,
    processingSession: 'Đang khởi tạo phiên thanh toán bảo mật…',
    waitingPayment: 'Đang chờ xác nhận thanh toán · Hệ thống tự động kích hoạt ngay khi nhận được giao dịch',
    securityGuarantee: 'Bảo mật SSL 256-bit · Chuẩn PCI-DSS Level 1 · Cổng thanh toán Polar MoR',
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
    subscriptionDetailsTitle: 'Subscription details',
    orderSummaryTitle: 'Order summary',
    paymentMethodTitle: 'Payment method',
    dueToday: 'Due today',
    subtotal: 'Plan Price',
    taxVat: 'Taxes & Fees',
    taxIncluded: 'Included (Polar MoR)',
    ctaButton: (usd) => `Proceed to secure checkout ($${usd.toFixed(2)} USD)`,
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
    subtitle: 'Polar（Merchant of Record）による安全な決済',
    steps: ['1. アカウント', '2. プラン選択', '3. 有効化完了'],
    checkingAccount: 'アカウント情報を確認中…',
    gateTitle: 'Googleログインが必要です',
    gateBody:
      'LayaMeet Proのライセンスはお客様のGoogleアカウントに紐づけられ、すべての端末で時間無制限の会議機能とAI字幕翻訳をご利用いただけます。',
    selectedPlan: '選択されたプラン',
    signIn: 'Googleでログインして続ける',
    signInError: 'Googleログインに失敗しました。再度お試しください。',
    accountBoundNotice: 'このアカウントにProライセンスが付与されます',
    chooseCycle: '請求サイクルを選択',
    savePercent: (pct) => `${pct}%お得`,
    popularBadge: '一番人気',
    billedPeriod: (months, usd, _vnd) =>
      `$${usd.toFixed(2)} USD / ${months}ヶ月分`,
    perMonth: '/ 月',
    subscriptionDetailsTitle: '契約内容の詳細',
    orderSummaryTitle: 'ご注文内容',
    paymentMethodTitle: 'お支払い方法',
    dueToday: '本日のお支払い合計',
    subtotal: 'プラン料金',
    taxVat: '税金および手数料',
    taxIncluded: '税込み (Polar MoR)',
    ctaButton: (usd) => `安全なお支払いへ進む ($${usd.toFixed(2)} USD)`,
    processingSession: '安全な決済セッションを作成中…',
    waitingPayment: '決済の確認を待機しています · 完了次第、自動的にアカウントがProへ切り替わります',
    securityGuarantee: '256ビットSSL暗号化 · PCI-DSS Level 1準拠 · Polar MoR',
    invoiceNotice: 'お支払い完了後、領収書および明細書がご登録のメールアドレスに自動送信されます。',
    paidTitle: 'Proプランの有効化が完了しました',
    paidBody: 'が正常にProへアップグレードされました。時間無制限の会議を開始できます。',
    expiresOn: '有効期限',
    done: '完了して会議に戻る',
    paymentPolicyLink: '支払いポリシー',
    refundPolicyLink: '返金ポリシー',
    supportEmail: 'サポート: support@layameet.com',
    retry: 'もう一度試す',
    orderError: '決済の初期化に失敗しました。もう一度お試しください。',
  },
};

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingCode?: string;
  initialPlanId?: string;
  onPaymentSuccess?: () => void;
}

const normalizePlanId = (rawId?: string): BillingPlanId => {
  if (rawId === 'pro_quarterly' || rawId === 'pro_annual' || rawId === 'pro_2year') {
    return rawId;
  }
  return 'pro';
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  meetingCode,
  initialPlanId,
  onPaymentSuccess,
}) => {
  const { language } = useLanguage();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const copy = CHECKOUT_I18N[language] || CHECKOUT_I18N.vi;

  const [selectedPlanId, setSelectedPlanId] = useState<BillingPlanId>(() =>
    normalizePlanId(initialPlanId),
  );
  const [plans, setPlans] = useState<PlanDisplayItem[]>(DEFAULT_PLANS);
  const [order, setOrder] = useState<PaymentOrderResponse | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');

  const pollingRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const requestSequenceRef = useRef<number>(0);
  const lastAutoRequestRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Fetch real plans from backend / Polar API if available
  useEffect(() => {
    let isMounted = true;
    meetingApi
      .getPolarProducts()
      .then((polarPlans) => {
        if (!isMounted || !Array.isArray(polarPlans) || polarPlans.length === 0) return;

        const planLookup = new Map<string, PolarProductPlan>();
        for (const p of polarPlans) {
          planLookup.set(p.polar_product_id, p);
        }

        const updated: PlanDisplayItem[] = DEFAULT_PLANS.map((def) => {
          const live = planLookup.get(def.polarProductId);
          if (!live) return def;

          return {
            ...def,
            name: live.name || def.name,
            priceUsd: live.price_usd,
            priceVnd: live.price_vnd,
            pricePerMonthUsd: live.price_per_month_usd,
            pricePerMonthVnd: live.price_per_month_vnd,
            savingsPercent: live.savings_percent,
          };
        });

        setPlans(updated);
      })
      .catch(() => {
        // Fallback to DEFAULT_PLANS
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchCheckoutSession = useCallback(
    async (planId: BillingPlanId) => {
      if (!user?.email) return;

      const requestId = (requestSequenceRef.current += 1);
      clearPolling();
      setIsLoading(true);
      setError(null);

      try {
        const selected = plans.find((p) => p.id === planId) || DEFAULT_PLANS[0];
        const fallbackUrl = `/checkout?products=${selected.polarProductId}&customer_email=${encodeURIComponent(user.email)}`;
        let liveUrl = fallbackUrl;

        try {
          const res = await fetch(
            `/checkout?products=${selected.polarProductId}&customer_email=${encodeURIComponent(user.email)}&format=json`,
            { headers: { Accept: 'application/json' } },
          );
          if (res.ok) {
            const polarSession = (await res.json()) as { checkout_url?: string };
            if (polarSession.checkout_url) {
              liveUrl = polarSession.checkout_url;
            }
          }
        } catch {
          // fallback to 303 endpoint
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
        // Non-blocking polling error
      }
    }, 2_500);

    return clearPolling;
  }, [clearPolling, isOpen, isPaid, onPaymentSuccess, orderCode, user?.email]);

  // Modal accessibility
  useEffect(() => {
    if (!isOpen) return undefined;

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

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      releaseScrollLock();
      window.removeEventListener('keydown', handleKeyDown);
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

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || DEFAULT_PLANS[0];

  const currentCheckoutUrl =
    checkoutUrl ||
    order?.checkoutUrl ||
    `/checkout?products=${currentPlan.polarProductId}&customer_email=${encodeURIComponent(user?.email || '')}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md"
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
        className="relative max-h-[calc(var(--app-height)-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-zinc-800 bg-[#09090c] text-zinc-100 shadow-2xl transition-all"
      >
        {/* Dismiss Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Top Header with Logo */}
        <header className="border-b border-zinc-800/80 px-6 py-5 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayaMeetLogo size="md" />
            <span className="hidden sm:inline-flex h-5 items-center rounded-md bg-[#00e676]/10 px-2 text-[10px] font-bold text-[#00e676] border border-[#00e676]/20">
              Pro Checkout
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mr-8 sm:mr-10">
            <Lock className="h-3.5 w-3.5 text-[#00e676]" />
            <span className="hidden sm:inline">256-bit SSL · Powered by Polar MoR</span>
          </div>
        </header>

        {/* Modal Body */}
        <main className="p-6 sm:p-8">
          {authLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-zinc-400" aria-busy="true">
              <Loader2 className="h-8 w-8 animate-spin text-[#00e676]" />
              <p className="mt-3 text-sm">{copy.checkingAccount}</p>
            </div>
          ) : !user?.email ? (
            /* Step 1: Sign in required */
            <section className="rounded-2xl border border-zinc-800 bg-[#121216] p-6 sm:p-8 max-w-lg mx-auto text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/20">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{copy.gateTitle}</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{copy.gateBody}</p>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-[#18181d] p-4 text-left">
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
                className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 cursor-pointer shadow-md"
              >
                <LogIn className="h-4 w-4" />
                <span>{copy.signIn}</span>
              </button>
            </section>
          ) : isPaid ? (
            /* Step 3: Success & Activated */
            <section
              className="rounded-2xl border border-[#00e676]/30 bg-[#00e676]/5 p-8 text-center max-w-lg mx-auto"
              role="status"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#00e676]">{copy.paidTitle}</h3>
              <p className="mt-2 text-xs text-zinc-300">
                Tài khoản <strong className="text-white">{user.email}</strong> {copy.paidBody}
              </p>
              <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#141418] p-3 text-xs text-zinc-300">
                <FileText className="h-4 w-4 text-[#00e676]" />
                <span>
                  {copy.expiresOn}:{' '}
                  <strong className="text-white">{formatExpiry(order?.subscriptionExpiresAt)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 min-h-11 rounded-xl bg-[#00e676] hover:bg-[#00c853] px-6 py-2.5 text-xs font-bold text-black transition cursor-pointer shadow-lg shadow-[#00e676]/20"
              >
                {copy.done}
              </button>
            </section>
          ) : (
            /* Step 2: TRAE 2-Column Subscription Details & Payment Method Layout */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* Left Column: Subscription details (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                  <span>{copy.subscriptionDetailsTitle}</span>
                </h3>

                <div className="rounded-2xl border border-zinc-800 bg-[#121216] p-5 space-y-4">
                  {/* Plan summary row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">{currentPlan.name}</span>
                      <Info className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="font-mono text-sm font-semibold text-zinc-200">
                      ${currentPlan.priceUsd.toFixed(2)} / {currentPlan.months === 1 ? '30 days' : `${currentPlan.months} mo`}
                    </span>
                  </div>

                  {/* Cycle Selector Pills inside modal */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {plans.map((p) => {
                      const isSelected = p.id === selectedPlanId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePlanChange(p.id)}
                          className={`p-2 rounded-xl text-left transition border cursor-pointer ${
                            isSelected
                              ? 'border-[#00e676] bg-[#00e676]/10 text-white'
                              : 'border-zinc-800/80 bg-[#18181e] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span>{p.months === 1 ? '1 Tháng' : p.months === 3 ? '1 Quý' : p.months === 12 ? '1 Năm' : '2 Năm'}</span>
                            {p.savingsPercent > 0 && (
                              <span className="text-[#00e676] text-[10px]">
                                -{p.savingsPercent}%
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-xs font-semibold text-zinc-200 mt-1">
                            ${p.priceUsd.toFixed(2)}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-zinc-800/80 pt-4 space-y-2.5">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      {copy.orderSummaryTitle}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{copy.subtotal}</span>
                      <span className="font-mono text-zinc-200">${currentPlan.priceUsd.toFixed(2)} USD</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{copy.taxVat}</span>
                      <span className="text-[#00e676] font-medium">{copy.taxIncluded}</span>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-3 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-white">{copy.dueToday}</span>
                      <div className="text-right">
                        <span className="font-mono text-xl font-extrabold text-white">
                          ${currentPlan.priceUsd.toFixed(2)}
                        </span>
                        <p className="text-[11px] text-zinc-400 font-normal">
                          ~{currentPlan.priceVnd.toLocaleString('vi-VN')} VND
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account binding info */}
                  <div className="rounded-xl bg-[#18181e] p-3 border border-zinc-800 flex items-center gap-2 text-[11px] text-zinc-400">
                    <Check className="w-3.5 h-3.5 text-[#00e676] shrink-0" />
                    <span className="truncate">
                      Gắn với: <strong className="text-zinc-200">{user.email}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment method (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300">
                  {copy.paymentMethodTitle}
                </h3>

                <div className="space-y-2.5">
                  {/* Option 1: Credit / debit card */}
                  <div
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`rounded-2xl border p-4 flex items-center justify-between transition-all cursor-pointer ${
                      selectedPaymentMethod === 'card'
                        ? 'border-[#00e676] bg-[#121216]'
                        : 'border-zinc-800 bg-[#121216]/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <VisaIcon className="h-4.5 w-auto" />
                        <MastercardIcon className="h-4.5 w-auto" />
                        <JcbIcon className="h-4.5 w-auto" />
                        <AmexIcon className="h-4.5 w-auto" />
                        <DiscoverIcon className="h-4.5 w-auto" />
                        <UnionPayIcon className="h-4.5 w-auto" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-white ml-1">
                        Credit / debit card
                      </span>
                    </div>

                    <div
                      className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedPaymentMethod === 'card'
                          ? 'border-[#00e676] bg-[#00e676]'
                          : 'border-zinc-600 bg-transparent'
                      }`}
                    >
                      {selectedPaymentMethod === 'card' && (
                        <div className="h-2 w-2 rounded-full bg-black" />
                      )}
                    </div>
                  </div>

                  {/* Option 2: Apple Pay */}
                  <div
                    onClick={() => setSelectedPaymentMethod('apple_pay')}
                    className={`rounded-2xl border p-4 flex items-center justify-between transition-all cursor-pointer ${
                      selectedPaymentMethod === 'apple_pay'
                        ? 'border-[#00e676] bg-[#121216]'
                        : 'border-zinc-800 bg-[#121216]/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ApplePayIcon className="h-6 w-auto" />
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          Apple Pay
                        </span>
                        <p className="text-[11px] text-zinc-400">
                          Thanh toán 1-chạm bảo mật trên Safari & thiết bị Apple
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedPaymentMethod === 'apple_pay'
                          ? 'border-[#00e676] bg-[#00e676]'
                          : 'border-zinc-600 bg-transparent'
                      }`}
                    >
                      {selectedPaymentMethod === 'apple_pay' && (
                        <div className="h-2 w-2 rounded-full bg-black" />
                      )}
                    </div>
                  </div>

                  {/* Option 3: Google Pay */}
                  <div
                    onClick={() => setSelectedPaymentMethod('google_pay')}
                    className={`rounded-2xl border p-4 flex items-center justify-between transition-all cursor-pointer ${
                      selectedPaymentMethod === 'google_pay'
                        ? 'border-[#00e676] bg-[#121216]'
                        : 'border-zinc-800 bg-[#121216]/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GooglePayIcon className="h-6 w-auto" />
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          Google Pay
                        </span>
                        <p className="text-[11px] text-zinc-400">
                          Thanh toán nhanh bảo mật qua Google Wallet & Chrome
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedPaymentMethod === 'google_pay'
                          ? 'border-[#00e676] bg-[#00e676]'
                          : 'border-zinc-600 bg-transparent'
                      }`}
                    >
                      {selectedPaymentMethod === 'google_pay' && (
                        <div className="h-2 w-2 rounded-full bg-black" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Action CTA & Polling Status */}
                <div className="pt-2 space-y-3">
                  {error ? (
                    <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-center">
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
                    <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-800 text-xs text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin text-[#00e676]" />
                      <span>{copy.processingSession}</span>
                    </div>
                  ) : (
                    <>
                      <a
                        href={currentCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00e676] hover:bg-[#00c853] px-5 py-3 text-sm font-bold text-black shadow-lg shadow-[#00e676]/20 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <Lock className="h-4 w-4" />
                        <span>{copy.ctaButton(currentPlan.priceUsd)}</span>
                        <ExternalLink className="h-4 w-4 ml-0.5 opacity-80" />
                      </a>

                      <div className="flex items-center justify-center gap-2 text-[11px] text-[#00e676]" role="status">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#00e676]" />
                        <span>{copy.waitingPayment}</span>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed text-zinc-500 text-center">
                  {copy.invoiceNotice}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Modal Footer with Compliance Links */}
        <footer className="border-t border-zinc-800/80 px-6 py-4 sm:px-8 bg-[#070709] flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00e676]" />
            <span>{copy.securityGuarantee}</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/payment-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00e676] underline-offset-2 hover:underline"
            >
              {copy.paymentPolicyLink}
            </a>
            <span>·</span>
            <a
              href="/refund-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00e676] underline-offset-2 hover:underline"
            >
              {copy.refundPolicyLink}
            </a>
            <span>·</span>
            <span className="text-zinc-500">{copy.supportEmail}</span>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
