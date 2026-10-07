import React, { useCallback, useEffect, useState } from 'react';
import { Check, Zap, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import { CheckoutModal } from '../common/CheckoutModal';
import { EnterpriseDemoModal } from './EnterpriseDemoModal';
import { useLanguage } from '../../context/language-context-def';
import { useAuth } from '../../context/auth-context-def';
import { AccountSubscriptionResponse, meetingApi } from '../../api/meetingApi';

const PENDING_CHECKOUT_PLAN_KEY = 'layameet:pending-checkout-plan';

const ACCOUNT_COPY = {
  vi: {
    signedIn: 'Đang đăng nhập',
    currentPlan: 'Gói hiện tại',
    checking: 'Đang kiểm tra',
    loginNote: '🔒 Yêu cầu đăng nhập Google để gắn bản quyền theo tài khoản',
  },
  en: {
    signedIn: 'Signed in',
    currentPlan: 'Current plan',
    checking: 'Checking',
    loginNote: '🔒 Requires Google sign-in to bind the license to your account',
  },
  ja: {
    signedIn: 'ログイン中',
    currentPlan: '現在のプラン',
    checking: '確認中',
    loginNote: '🔒 ライセンスをアカウントに紐づけるにはGoogleログインが必要です',
  },
};

interface PricingTier {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  desc: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  priceNote: string;
  ctaText: string;
  ctaVariant: 'primary' | 'secondary' | 'outline';
  features: string[];
}

interface PricingLanguageContent {
  badge: string;
  title: string;
  subtitle: string;
  monthly: string;
  annual: string;
  save20: string;
  monthSuffix: string;
  customTier: string;
  assuranceTitle: string;
  assuranceText: string;
  vpsHelp: string;
  tiers: PricingTier[];
}

const PRICING_CONTENT: Record<string, PricingLanguageContent> = {
  vi: {
    badge: 'Bảng Giá Đơn Giản & Minh Bạch',
    title: 'Chỉ 2 gói duy nhất: Miễn phí hoặc Không giới hạn',
    subtitle: 'Bắt đầu miễn phí ngay lập tức, nâng cấp gói Pro tháng (99.000đ), 1 năm hoặc 2 năm (tiết kiệm đến 35%) khi bạn cần họp nhóm không giới hạn.',
    monthly: 'Thanh toán tháng',
    annual: 'Thanh toán năm',
    save20: 'Tiết kiệm 20%',
    monthSuffix: '/ tháng',
    customTier: 'Tùy Biến',
    assuranceTitle: 'Cam kết không rủi ro:',
    assuranceText: 'Bản quyền vĩnh viễn với On-Premise, hỗ trợ cài đặt thử nghiệm PoC 14 ngày miễn phí.',
    vpsHelp: 'Cần tư vấn hạ tầng VPS / Server riêng?',
    tiers: [
      {
        id: 'free',
        name: 'Free',
        badge: 'Miễn Phí Vĩnh Viễn',
        desc: 'Dành cho cá nhân, freelancer và sinh viên họp trực tuyến dịch song ngữ mỗi ngày.',
        monthlyPrice: 0,
        annualPrice: 0,
        priceNote: 'Miễn phí 100% · Không cần thẻ ngân hàng',
        ctaText: 'Tạo Phòng Họp Ngay',
        ctaVariant: 'secondary' as const,
        features: [
          'Họp 1-on-1 không giới hạn thời gian',
          'Họp nhóm (từ 3 người) tối đa 40 phút / cuộc',
          'Phụ đề AI dịch trực tiếp 50+ ngôn ngữ (<350ms)',
          'Cửa sổ phụ đề nổi (PiP) đè lên Zoom / Google Meet',
          'Tóm tắt biên bản họp & chia sẻ nhanh Zalo / Slack',
          'Xử lý âm thanh RAM-only (Không lưu file ghi âm)',
        ],
      },
      {
        id: 'pro',
        name: 'Gói Tháng Pro',
        badge: 'Khuyên Dùng · Rẻ Hơn Zoom 75%',
        popular: true,
        desc: 'Dành cho Freelancer chuyên nghiệp, nhóm dự án IT Outsourcing và giảng viên ngoại ngữ.',
        monthlyPrice: 99000,
        annualPrice: 79000,
        priceNote: 'trên mỗi tài khoản Host / tháng',
        ctaText: 'Đăng Ký Gói Tháng (99.000đ)',
        ctaVariant: 'primary' as const,
        features: [
          'Không giới hạn thời lượng cho mọi cuộc họp nhóm',
          'Không giới hạn số phút dịch thuật AI đa chiều (Any-to-Any)',
          'Tự do chọn ngôn ngữ phụ đề riêng cho từng người tham gia',
          'Laya AI tự động trích xuất Action Items & Decisions',
          'Xuất biên bản họp tự động (Markdown / Word / PDF)',
          'Xóa watermark thương hiệu trên phụ đề & biên bản xuất ra',
          'Hỗ trợ kỹ thuật ưu tiên 24/7 qua Zalo / Slack',
        ],
      },
    ],
  },
  en: {
    badge: 'Simple & Transparent Pricing',
    title: 'Only 2 Plans: Free or Unlimited',
    subtitle: 'Start 100% free immediately. Upgrade to Pro monthly ($4.99), 1-year, or 2-year (save up to 35%) for unlimited group meetings.',
    monthly: 'Billed Monthly',
    annual: 'Billed Annually',
    save20: 'Save 20%',
    monthSuffix: '/ month',
    customTier: 'Custom Plan',
    assuranceTitle: 'Zero-Risk Commitment:',
    assuranceText: 'Perpetual licenses for On-Premise. 14-day risk-free PoC trial with money-back guarantee.',
    vpsHelp: 'Need dedicated VPS or on-premises architecture advice?',
    tiers: [
      {
        id: 'free',
        name: 'Free Forever',
        badge: 'Zero Cost',
        desc: 'Ideal for individuals, freelancers, and students needing daily live bilingual meetings.',
        monthlyPrice: 0,
        annualPrice: 0,
        priceNote: '100% Free · No credit card required',
        ctaText: 'Start Meeting Now',
        ctaVariant: 'secondary' as const,
        features: [
          'Unlimited 1-on-1 meeting duration',
          'Group meetings (3+ participants) up to 40 mins',
          'Live AI subtitles in 50+ languages (<350ms)',
          'Picture-in-Picture (PiP) overlay on Zoom & Google Meet',
          'Meeting minutes summary & quick Slack/Email export',
          'RAM-only zero-disk security (No raw audio stored)',
        ],
      },
      {
        id: 'pro',
        name: 'Pro Unlimited',
        badge: 'Recommended · 75% Cheaper than Zoom',
        popular: true,
        desc: 'For global teams, IT outsourcing agencies, and cross-border project managers.',
        monthlyPrice: 4.99,
        annualPrice: 3.99,
        priceNote: 'per host account / month',
        ctaText: 'Upgrade to Pro ($4.99/mo)',
        ctaVariant: 'primary' as const,
        features: [
          'Unlimited meeting duration for all group calls',
          'Unlimited multi-directional AI translation minutes',
          'Independent subtitle language per participant',
          'Laya AI automatic Action Items & Decisions',
          'Instant export of meeting minutes (Markdown / Word / PDF)',
          'Brand watermark removed from subtitles & minutes',
          '24/7 priority enterprise technical support',
        ],
      },
    ],
  },
  ja: {
    badge: 'シンプルで明瞭な料金体系',
    title: '2つのプランのみ: 無料または無制限',
    subtitle: 'クレジットカード不要で今すぐ無料利用開始。月額、1年、2年プラン（最大35%お得）から選択できます。',
    monthly: '月払い',
    annual: '年払い',
    save20: '20% お得',
    monthSuffix: '/ 月',
    customTier: 'カスタム設計',
    assuranceTitle: 'リスクゼロの保証:',
    assuranceText: 'オンプレミス版の永久ライセンス提供。企業向け14日間無料PoC実証実験に対応。',
    vpsHelp: '専用VPSやオンプレミスサーバーの導入相談はこちら',
    tiers: [
      {
        id: 'free',
        name: 'フリープラン',
        badge: '永久無料',
        desc: '個人、フリーランス、学生向けのリアルタイム多言語ミーティング。',
        monthlyPrice: 0,
        annualPrice: 0,
        priceNote: '完全無料 · クレジットカード登録不要',
        ctaText: '今すぐ会議を作成',
        ctaVariant: 'secondary' as const,
        features: [
          '1対1ミーティング時間無制限',
          '3人以上のグループ会議は40分まで',
          '50以上の言語によるリアルタイムAI字幕 (<350ms)',
          'ZoomやTeamsの上に重ねるフローティングPiP字幕',
          '議事録サマリーとSlack/チャットへの簡単共有',
          '完全RAMメモリ処理 (音声ファイル保存なし)',
        ],
      },
      {
        id: 'pro',
        name: 'Pro 月額プラン',
        badge: 'おすすめ · Zoom比75%低コスト',
        popular: true,
        desc: 'IT受託開発チーム、海外拠点との定期ミーティング、語学教育機関向け。',
        monthlyPrice: 680,
        annualPrice: 550,
        priceNote: '1ホストあたり / 月',
        ctaText: 'Proプランを契約 (約680円/月)',
        ctaVariant: 'primary' as const,
        features: [
          'すべてのグループ会議で時間無制限',
          '双方向AI多言語翻訳が無制限',
          '参加者ごとに自由な字幕言語選択',
          'Laya AIによる決定事項・タスク自動抽出',
          '議事録自動エクスポート (Markdown / Word / PDF)',
          '字幕および議事録の透かし削除',
          '24/7優先テクニカルサポート',
        ],
      },
    ],
  },
};

interface PricingSectionProps {
  onSelectTier?: (tierId: string) => void;
  onContactClick?: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectTier, onContactClick }) => {
  const { language } = useLanguage();
  const { user, signInWithGoogle } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<AccountSubscriptionResponse | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const content = PRICING_CONTENT[language] || PRICING_CONTENT.vi;
  const accountCopy = ACCOUNT_COPY[language] || ACCOUNT_COPY.vi;

  const refreshSubscription = useCallback(async () => {
    if (!user?.email) {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }

    setSubscriptionLoading(true);
    try {
      setSubscription(await meetingApi.getAccountSubscription(user.email));
    } catch {
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  useEffect(() => {
    if (!user?.email) return;

    try {
      const pendingPlan = window.sessionStorage.getItem(PENDING_CHECKOUT_PLAN_KEY);
      if (pendingPlan !== 'pro' && pendingPlan !== 'pro_annual') return;

      setIsAnnual(pendingPlan === 'pro_annual');
      setIsCheckoutOpen(true);
      window.sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
    } catch {
      // The user can still open checkout manually when sessionStorage is unavailable.
    }
  }, [user?.email]);

  const handleAccountNoteSignIn = async () => {
    setAccountError(null);
    try {
      window.sessionStorage.setItem(
        PENDING_CHECKOUT_PLAN_KEY,
        isAnnual ? 'pro_annual' : 'pro',
      );
      await signInWithGoogle(`${window.location.pathname}${window.location.search}#pricing`);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Google sign-in failed.');
    }
  };

  const handlePaymentSuccess = useCallback(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const handleEnterpriseClick = () => {
    if (onContactClick) {
      onContactClick();
    }
    setIsDemoModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    if (language === 'en') {
      return `$${amount.toFixed(2)}`;
    }
    if (language === 'ja') {
      return `¥${amount.toLocaleString('ja-JP')}`;
    }
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  return (
    <section id="pricing" className="border-t border-zinc-200 dark:border-[#2e2e30] py-16 md:py-24 relative overflow-hidden bg-white/40 dark:bg-[#0f0f10]/40 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>{content.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            {content.title}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {content.subtitle}
          </p>

          {/* Billing Interval Switcher */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button type="button" className={`text-xs font-medium cursor-pointer transition-colors ${!isAnnual ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-500'}`} onClick={() => setIsAnnual(false)}>
              {content.monthly}
            </button>
            <button
              type="button"
              role="switch"
              aria-label={`${content.monthly} / ${content.annual}`}
              aria-checked={isAnnual}
              onClick={() => setIsAnnual(!isAnnual)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                isAnnual ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  isAnnual ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <button type="button" className={`text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${isAnnual ? 'text-zinc-950 dark:text-white font-semibold' : 'text-zinc-500'}`} onClick={() => setIsAnnual(true)}>
              <span>{content.annual}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {content.save20}
              </span>
            </button>
          </div>
        </div>

        {user?.email && (
          <div className="mx-auto mb-6 flex max-w-4xl justify-center">
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-normal text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
              {accountCopy.signedIn}: <strong>{user.email}</strong>
              {' · '}
              {accountCopy.currentPlan}:{' '}
              <strong>
                {subscriptionLoading
                  ? accountCopy.checking
                  : subscription?.isPro
                    ? 'Pro Unlimited'
                    : 'Free'}
              </strong>
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {content.tiers.map((tier) => {
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  tier.popular
                    ? 'bg-white dark:bg-[#18181b] border-2 border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-500/5 ring-1 ring-blue-500/20'
                    : 'bg-white/80 dark:bg-[#151517] border border-zinc-200 dark:border-[#2e2e30] hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                }`}
              >
                {/* Popular Pill */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-600 text-white shadow-xs whitespace-nowrap">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                      {tier.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 min-h-[32px]">
                      {tier.desc}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="py-4 border-y border-zinc-100 dark:border-zinc-800/80 mb-5">
                    {price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-zinc-950 dark:text-white font-mono">
                          {price === 0 ? (language === 'en' ? '$0' : language === 'ja' ? '¥0' : '0đ') : formatCurrency(price)}
                        </span>
                        {price > 0 && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {content.monthSuffix}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-zinc-950 dark:text-white">
                        {content.customTier}
                      </div>
                    )}
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-1">
                      {tier.priceNote}
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 mb-6 text-xs text-zinc-700 dark:text-zinc-300">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (tier.id === 'pro') {
                        setIsCheckoutOpen(true);
                      } else if (tier.id === 'enterprise') {
                        handleEnterpriseClick();
                      } else if (onSelectTier) {
                        onSelectTier(tier.id);
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tier.popular
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : tier.id === 'enterprise'
                        ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {!user && tier.id === 'pro' && (
                    <button
                      type="button"
                      onClick={() => void handleAccountNoteSignIn()}
                      className="mt-2 w-full text-center text-[11px] leading-relaxed text-zinc-500 underline-offset-2 hover:text-blue-600 hover:underline dark:text-zinc-400 dark:hover:text-blue-400"
                    >
                      {accountCopy.loginNote}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {accountError && (
          <p role="alert" className="mx-auto mt-3 max-w-4xl text-center text-xs text-red-600 dark:text-red-400">
            {accountError}
          </p>
        )}

        {/* Assurance Guarantee Strip */}
        <div className="mt-10 p-4 rounded-2xl bg-zinc-50 dark:bg-[#141416] border border-zinc-200 dark:border-[#2e2e30] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>{content.assuranceTitle}</strong> {content.assuranceText}
            </span>
          </div>
          <button
            type="button"
            onClick={handleEnterpriseClick}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline shrink-0 cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{content.vpsHelp}</span>
          </button>
        </div>

        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          initialPlanId={isAnnual ? 'pro_annual' : 'pro'}
          onPaymentSuccess={handlePaymentSuccess}
        />

        <EnterpriseDemoModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
        />
      </div>
    </section>
  );
};
