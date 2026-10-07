import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  LogIn,
  QrCode,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { meetingApi, PaymentOrderResponse } from '../../api/meetingApi';
import { useAuth } from '../../context/auth-context-def';
import { useLanguage } from '../../context/language-context-def';

const PENDING_CHECKOUT_PLAN_KEY = 'layameet:pending-checkout-plan';
const PAYMENT_ORDER_ERROR = '__PAYMENT_ORDER_FAILED__';

type BillingPlanId = 'pro' | 'pro_annual' | 'pro_2year';

interface CheckoutCopy {
  close: string;
  title: string;
  subtitle: string;
  steps: string[];
  checkingAccount: string;
  gateTitle: string;
  gateBody: string;
  selectedPlan: string;
  monthly: string;
  annual: string;
  biennial: string;
  signIn: string;
  signInError: string;
  boundBadge: string;
  choosePlan: string;
  save20: string;
  save35: string;
  creatingQr: string;
  paymentHint: string;
  waiting: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  amount: string;
  transferContent: string;
  retry: string;
  orderError: string;
  paidTitle: string;
  paidBody: string;
  expires: string;
  done: string;
  security: string;
  paymentMethod: string;
  vietqrTab: string;
  polarTab: string;
  vietqrBadge: string;
  polarBadge: string;
  openPolarCheckout: string;
  polarWaiting: string;
  polarHint: string;
}

const PLAN_OPTIONS: Array<{
  id: BillingPlanId;
  price: string;
  vndPrice: string;
  usdPrice: string;
  duration: string;
  savings?: string;
}> = [
  { id: 'pro', price: '99.000đ · $4.99', vndPrice: '99.000đ', usdPrice: '$4.99', duration: '1 month' },
  { id: 'pro_annual', price: '948.000đ · $47.88', vndPrice: '948.000đ', usdPrice: '$47.88', duration: '12 months', savings: '20%' },
  { id: 'pro_2year', price: '1.544.000đ · $78.00', vndPrice: '1.544.000đ', usdPrice: '$78.00', duration: '24 months', savings: '35%' },
];

const CHECKOUT_COPY: Record<'vi' | 'en' | 'ja', CheckoutCopy> = {
  vi: {
    close: 'Đóng thanh toán',
    title: 'Nâng cấp LayaMeet Pro Unlimited',
    subtitle: 'Bản quyền theo tài khoản · Kích hoạt tự động qua VietQR & Thẻ quốc tế',
    steps: ['1. Tài khoản', '2. Thanh toán', '3. Kích hoạt Pro'],
    checkingAccount: 'Đang kiểm tra tài khoản đăng nhập…',
    gateTitle: 'Cần tài khoản Google',
    gateBody:
      'LayaMeet Pro Unlimited được gắn trực tiếp với email tài khoản Google để quyền Host, thời lượng không giới hạn và hạn mức token đồng bộ trên mọi thiết bị.',
    selectedPlan: 'Gói đã chọn',
    monthly: 'Gói LayaMeet Pro 1 Tháng (99.000đ / tháng)',
    annual: 'Gói LayaMeet Pro 1 Năm (Tiết kiệm 20%)',
    biennial: 'Gói LayaMeet Pro 2 Năm (Tiết kiệm 35%)',
    signIn: 'Đăng nhập bằng Google để tiếp tục',
    signInError: 'Không thể bắt đầu đăng nhập Google.',
    boundBadge: 'Bản quyền Pro sẽ gắn với tài khoản này',
    choosePlan: 'Chọn chu kỳ thanh toán',
    save20: 'Tiết kiệm 20%',
    save35: 'Tiết kiệm 35%',
    creatingQr: 'Đang khởi tạo phiên thanh toán cho tài khoản của bạn…',
    paymentHint: 'Chuyển khoản đúng số tiền và nội dung để kích hoạt tự động.',
    waiting: 'Đang chờ chuyển khoản · Tự nhận diện',
    bank: 'Ngân hàng',
    accountNumber: 'Số tài khoản',
    accountName: 'Chủ tài khoản',
    amount: 'Số tiền',
    transferContent: 'Nội dung chuyển khoản',
    retry: 'Thử tạo lại mã thanh toán',
    orderError: 'Không thể tạo đơn thanh toán. Vui lòng thử lại.',
    paidTitle: 'Pro Unlimited đã được kích hoạt',
    paidBody: 'đã được nâng cấp và có thể sử dụng quyền Pro trên mọi thiết bị.',
    expires: 'Ngày hết hạn',
    done: 'Hoàn tất',
    security: 'Bảo mật giao dịch Napas 247 & Polar MoR · Kích hoạt tự động',
    paymentMethod: 'Phương thức thanh toán',
    vietqrTab: 'VietQR / PayOS (Napas 247)',
    polarTab: 'Thẻ Quốc tế / Apple Pay (Polar)',
    vietqrBadge: 'Phí 0% · Mọi App Ngân hàng VN',
    polarBadge: 'Toàn cầu · Visa / Apple Pay',
    openPolarCheckout: 'Mở trang thanh toán Polar.sh / Apple Pay',
    polarWaiting: 'Đang kết nối cổng thẻ quốc tế · Tự nhận diện khi thanh toán xong',
    polarHint: 'Thanh toán bảo mật toàn cầu hỗ trợ thẻ tín dụng Visa, Mastercard, Apple Pay & Google Pay qua Polar.sh MoR.',
  },
  en: {
    close: 'Close checkout',
    title: 'Upgrade to LayaMeet Pro Unlimited',
    subtitle: 'Account-bound license · Automatic VietQR & International Card activation',
    steps: ['1. Account', '2. Payment', '3. Activated'],
    checkingAccount: 'Checking your signed-in account…',
    gateTitle: 'Google account required',
    gateBody:
      'LayaMeet Pro Unlimited is bound directly to your Google account email, so host privileges, unlimited duration, and token quota stay synced across every device.',
    selectedPlan: 'Selected plan',
    monthly: 'Pro Monthly',
    annual: 'Pro Annual',
    biennial: 'Pro 2 Years',
    signIn: 'Sign in with Google to Continue',
    signInError: 'Could not start Google sign-in.',
    boundBadge: 'Pro license will be bound to this account',
    choosePlan: 'Choose billing cycle',
    save20: 'Save 20%',
    save35: 'Save 35%',
    creatingQr: 'Initializing payment session for your account…',
    paymentHint: 'Transfer the exact amount and reference for automatic activation.',
    waiting: 'Waiting for transfer · Auto-detection enabled',
    bank: 'Bank',
    accountNumber: 'Account number',
    accountName: 'Account name',
    amount: 'Amount',
    transferContent: 'Transfer reference',
    retry: 'Create payment code again',
    orderError: 'Could not create the payment order. Please try again.',
    paidTitle: 'Pro Unlimited is activated',
    paidBody: 'is upgraded and can use Pro privileges on every device.',
    expires: 'Subscription expires',
    done: 'Done',
    security: 'Napas 247 secured & Polar MoR · Automatic activation',
    paymentMethod: 'Payment method',
    vietqrTab: 'VietQR (Vietnam Bank Transfer)',
    polarTab: 'Credit Card / Apple Pay (Polar)',
    vietqrBadge: '0% fee · Any Vietnam banking app',
    polarBadge: 'Worldwide · Visa / Apple Pay',
    openPolarCheckout: 'Open Polar.sh / Apple Pay Checkout',
    polarWaiting: 'Waiting for international card transfer · Auto-detected when paid',
    polarHint: 'Secure worldwide checkout powered by Polar.sh MoR supporting Visa, Mastercard, Apple Pay & Google Pay.',
  },
  ja: {
    close: '決済画面を閉じる',
    title: 'LayaMeet Pro Unlimitedへアップグレード',
    subtitle: 'アカウント連携ライセンス · VietQR & 国際カード自動有効化',
    steps: ['1. アカウント', '2. お支払い', '3. 有効化済み'],
    checkingAccount: 'ログイン中のアカウントを確認しています…',
    gateTitle: 'Googleアカウントが必要です',
    gateBody:
      'LayaMeet Pro UnlimitedはGoogleアカウントのメールに直接紐づき、ホスト権限、無制限の会議時間、トークン枠をすべての端末で同期します。',
    selectedPlan: '選択中のプラン',
    monthly: 'Pro 月額プラン',
    annual: 'Pro 年額プラン',
    biennial: 'Pro 2年プラン',
    signIn: 'Googleでログインして続行',
    signInError: 'Googleログインを開始できませんでした。',
    boundBadge: 'Proライセンスはこのアカウントに紐づきます',
    choosePlan: '請求サイクルを選択',
    save20: '20%お得',
    save35: '35%お得',
    creatingQr: 'アカウント用の決済セッションを初期化しています…',
    paymentHint: '自動有効化のため、正確な金額と振込内容を入力してください。',
    waiting: '振込待ち · 自動検出中',
    bank: '銀行',
    accountNumber: '口座番号',
    accountName: '口座名義',
    amount: '金額',
    transferContent: '振込内容',
    retry: '決済コードを再作成',
    orderError: '決済注文を作成できませんでした。もう一度お試しください。',
    paidTitle: 'Pro Unlimitedが有効になりました',
    paidBody: 'のアップグレードが完了し、すべての端末でPro機能を利用できます。',
    expires: '有効期限',
    done: '完了',
    security: 'Napas 247セキュア送金 & Polar MoR · 自動有効化',
    paymentMethod: 'お支払い方法',
    vietqrTab: 'VietQR (ベトナム銀行振込)',
    polarTab: '国際カード / Apple Pay (Polar)',
    vietqrBadge: '手数料0% · ベトナム銀行アプリ',
    polarBadge: '世界対応 · Visa / Apple Pay',
    openPolarCheckout: 'Polar.sh / Apple Pay 決済画面を開く',
    polarWaiting: '国際カード決済の完了を待機中 · 完了時に自動有効化',
    polarHint: 'Polar.sh MoRによる安全な世界対応決済（Visa、Mastercard、Apple Pay、Google Pay対応）。',
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
  const [selectedPlanId, setSelectedPlanId] = useState<BillingPlanId>(
    normalizePlanId(initialPlanId),
  );
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'polar'>(
    language === 'vi' ? 'vietqr' : 'polar',
  );
  const [order, setOrder] = useState<PaymentOrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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

  const fetchOrder = useCallback(
    async (planId: BillingPlanId, method?: 'vietqr' | 'polar') => {
      if (!user?.email) return;

      const activeMethod = method || paymentMethod;
      const currency = activeMethod === 'polar' ? 'USD' : 'VND';

      const requestId = ++requestSequenceRef.current;
      setIsLoading(true);
      setIsPaid(false);
      setError(null);
      setOrder(null);
      clearPolling();

      try {
        const newOrder = await meetingApi.createPaymentOrder(
          planId,
          meetingCode,
          user.email,
          user.fullName,
          user.id,
          activeMethod,
          currency,
        );
        if (requestId === requestSequenceRef.current) setOrder(newOrder);
      } catch (requestError) {
        if (requestId === requestSequenceRef.current) {
          setError(requestError instanceof Error ? requestError.message : PAYMENT_ORDER_ERROR);
        }
      } finally {
        if (requestId === requestSequenceRef.current) setIsLoading(false);
      }
    },
    [clearPolling, meetingCode, paymentMethod, user?.email, user?.fullName, user?.id],
  );

  useEffect(() => {
    if (!isOpen) {
      requestSequenceRef.current += 1;
      lastAutoRequestRef.current = null;
      clearPolling();
      setOrder(null);
      setIsPaid(false);
      setError(null);
      return;
    }

    const initialPlan = normalizePlanId(initialPlanId);
    const initialMethod = language === 'vi' ? 'vietqr' : 'polar';
    setSelectedPlanId(initialPlan);
    setPaymentMethod(initialMethod);
    setCopiedField(null);

    if (!user?.email) {
      setIsLoading(false);
      setOrder(null);
      return;
    }

    const requestKey = `${user.id}:${initialPlan}:${initialMethod}:${meetingCode || ''}`;
    if (lastAutoRequestRef.current === requestKey) return;
    lastAutoRequestRef.current = requestKey;
    void fetchOrder(initialPlan, initialMethod);
  }, [clearPolling, fetchOrder, initialPlanId, isOpen, language, meetingCode, user?.email, user?.id]);

  const orderCode = order?.orderCode;

  useEffect(() => {
    if (!isOpen || !orderCode || isPaid) return undefined;

    pollingRef.current = window.setInterval(async () => {
      try {
        const latest = await meetingApi.getPaymentOrder(orderCode);
        const status = latest.status.toLowerCase();
        if (status === 'paid') {
          setOrder(latest);
          setIsPaid(true);
          clearPolling();
          onPaymentSuccess?.();
        } else if (status !== 'pending') {
          clearPolling();
        }
      } catch {
        // Keep polling; a transient failure must not lose payment confirmation.
      }
    }, 2_500);

    return clearPolling;
  }, [clearPolling, isOpen, isPaid, onPaymentSuccess, orderCode]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  const handlePlanChange = (planId: BillingPlanId) => {
    if (planId === selectedPlanId) return;
    setSelectedPlanId(planId);
    lastAutoRequestRef.current = `${user?.id || ''}:${planId}:${paymentMethod}:${meetingCode || ''}`;
    if (user?.email) void fetchOrder(planId, paymentMethod);
  };

  const handleMethodChange = (newMethod: 'vietqr' | 'polar') => {
    if (newMethod === paymentMethod) return;
    setPaymentMethod(newMethod);
    lastAutoRequestRef.current = `${user?.id || ''}:${selectedPlanId}:${newMethod}:${meetingCode || ''}`;
    if (user?.email) void fetchOrder(selectedPlanId, newMethod);
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

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2_000);
  };

  const formatExpiry = (value?: string | null) => {
    if (!value) return '—';
    const locale = language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'vi-VN';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value));
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const activeStep = !user ? 1 : isPaid ? 3 : 2;
  const selectedPlan = PLAN_OPTIONS.find((plan) => plan.id === selectedPlanId)!;
  const selectedPlanName =
    selectedPlanId === 'pro_annual'
      ? copy.annual
      : selectedPlanId === 'pro_2year'
        ? copy.biennial
        : copy.monthly;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="border-b border-zinc-800 px-5 pb-5 pt-6 sm:px-7">
          <div className="pr-12">
            <h2 id="checkout-title" className="text-xl font-bold text-white">{copy.title}</h2>
            <p className="mt-1 text-xs text-zinc-400">{copy.subtitle}</p>
          </div>
          <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Checkout progress">
            {copy.steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === activeStep;
              const isComplete = stepNumber < activeStep;
              return (
                <li
                  key={step}
                  aria-current={isActive ? 'step' : undefined}
                  className={`rounded-lg border px-2 py-2 text-center text-[10px] font-semibold sm:text-xs ${
                    isActive
                      ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                      : isComplete
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {step}
                </li>
              );
            })}
          </ol>
        </header>

        <main className="p-5 sm:p-7">
          {authLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-zinc-400" aria-busy="true">
              <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
              <p className="mt-3 text-sm">{copy.checkingAccount}</p>
            </div>
          ) : !user?.email ? (
            <section className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 sm:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-300">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{copy.gateTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{copy.gateBody}</p>

              <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-zinc-700 bg-zinc-900/80 p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">{copy.selectedPlan}</p>
                  <p className="mt-1 font-semibold text-white">{selectedPlanName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-emerald-300">{selectedPlan.price}</p>
                  <p className="text-[11px] text-zinc-500">{selectedPlan.duration}</p>
                </div>
              </div>

              {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <LogIn className="h-5 w-5" />
                {copy.signIn}
              </button>
            </section>
          ) : isPaid && order ? (
            <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center" role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-emerald-200">{copy.paidTitle}</h3>
              <p className="mt-2 text-sm text-zinc-300"><strong className="text-white">{user.email}</strong> {copy.paidBody}</p>
              <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 p-3 text-sm text-zinc-300">
                <CalendarDays className="h-4 w-4 text-emerald-300" />
                <span>{copy.expires}: <strong>{formatExpiry(order.subscriptionExpiresAt)}</strong></span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 min-h-11 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                {copy.done}
              </button>
            </section>
          ) : (
            <section>
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-3">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500/20 font-bold text-sky-300">
                    {(user.fullName || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
                  <p className="truncate text-xs text-zinc-400">{user.email}</p>
                </div>
                <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 sm:inline-flex">
                  {copy.boundBadge}
                </span>
              </div>
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-zinc-300">{copy.paymentMethod}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleMethodChange('vietqr')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      paymentMethod === 'vietqr'
                        ? 'border-sky-500 bg-sky-500/15'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{copy.vietqrTab}</p>
                      <p className="text-[10px] text-zinc-400">{copy.vietqrBadge}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMethodChange('polar')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      paymentMethod === 'polar'
                        ? 'border-sky-500 bg-sky-500/15'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{copy.polarTab}</p>
                      <p className="text-[10px] text-zinc-400">{copy.polarBadge}</p>
                    </div>
                  </button>
                </div>
              </div>

              <p className="mb-2 text-xs font-semibold text-zinc-300">{copy.choosePlan}</p>
              <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PLAN_OPTIONS.map((plan) => {
                  const selected = plan.id === selectedPlanId;
                  const planLabel =
                    plan.id === 'pro'
                      ? copy.monthly
                      : plan.id === 'pro_2year'
                        ? copy.biennial
                        : copy.annual;
                  const savingsLabel = plan.id === 'pro_2year' ? copy.save35 : copy.save20;
                  const displayPrice = paymentMethod === 'polar' ? plan.usdPrice : plan.vndPrice;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handlePlanChange(plan.id)}
                      className={`min-h-20 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        selected
                          ? 'border-sky-500 bg-sky-500/15'
                          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white sm:text-sm">{planLabel}</span>
                        {plan.savings && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            {savingsLabel}
                          </span>
                        )}
                      </span>
                      <span className="mt-2 block font-mono text-sm font-bold text-sky-300">{displayPrice}</span>
                    </button>
                  );
                })}
              </div>

              {error ? (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-center">
                  <p className="text-sm text-red-300">
                    {error === PAYMENT_ORDER_ERROR ? copy.orderError : error}
                  </p>
                  <button
                    type="button"
                    onClick={() => void fetchOrder(selectedPlanId, paymentMethod)}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25"
                  >
                    <RefreshCw className="h-4 w-4" /> {copy.retry}
                  </button>
                </div>
              ) : isLoading || !order ? (
                <div className="flex min-h-56 flex-col items-center justify-center text-zinc-400" aria-busy="true">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                  <p className="mt-3 text-sm">{copy.creatingQr}</p>
                </div>
              ) : order.paymentMethod === 'polar' ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{copy.selectedPlan}</p>
                      <h4 className="text-base font-bold text-white">{selectedPlanName}</h4>
                      <p className="mt-1 text-xs text-zinc-400">{copy.polarHint}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-2xl font-bold text-sky-400">
                        ${order.amountUsd ?? selectedPlan.usdPrice} USD
                      </p>
                      <p className="text-[10px] text-zinc-500">Polar MoR ? Zero VAT hassle</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-200">Visa</span>
                    <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-200">Mastercard</span>
                    <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-200">Apple Pay</span>
                    <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-200">Google Pay</span>
                    <span className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-200">JCB</span>
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    <a
                      href={order.checkoutUrl || `https://sandbox.polar.sh/checkout/${order.orderCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    >
                      <CreditCard className="h-4 w-4" />
                      {copy.openPolarCheckout}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-300" role="status">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                      {copy.polarWaiting}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-4 text-xs text-zinc-400">{copy.paymentHint}</p>
                  <div className="grid grid-cols-1 items-center gap-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:grid-cols-2">
                    <div className="flex flex-col items-center">
                      <div className="rounded-xl border border-zinc-700 bg-white p-2 shadow-lg">
                        <img src={order.qrUrl} alt="VietQR payment code" className="h-48 w-48 object-contain" />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-300" role="status">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        {copy.waiting}
                      </div>
                    </div>
                    <dl className="space-y-2 text-xs">
                      {([
                        [copy.bank, order.bankId, null],
                        [copy.accountNumber, order.accountNumber, 'account'],
                        [copy.accountName, order.accountName, null],
                        [copy.amount, `${order.amount.toLocaleString('vi-VN')} VND`, null],
                        [copy.transferContent, order.orderCode, 'reference'],
                      ] as Array<[string, string, string | null]>).map(([label, value, copyField]) => (
                        <div key={label} className="flex items-center justify-between gap-3 border-b border-zinc-800 py-2 last:border-0">
                          <dt className="text-zinc-400">{label}</dt>
                          <dd className="text-right font-semibold text-white">
                            {copyField ? (
                              <button
                                type="button"
                                onClick={() => void handleCopy(value, copyField)}
                                className="inline-flex min-h-11 items-center gap-1 font-mono text-sky-300 hover:text-sky-200"
                              >
                                {value}
                                {copiedField === copyField ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            ) : value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-800 px-5 py-3 text-[11px] text-zinc-500 sm:px-7">
          <span className="flex items-center gap-1.5 text-zinc-400"><ShieldCheck className="h-4 w-4 text-sky-400" /> {copy.security}</span>
          <span className="hidden items-center gap-1 sm:flex"><Zap className="h-3.5 w-3.5" /> support@layameet.com</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
