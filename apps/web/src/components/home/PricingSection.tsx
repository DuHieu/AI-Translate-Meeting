import React, { useCallback, useEffect, useState } from 'react';
import { Check, Zap, ShieldCheck, ArrowRight, HelpCircle, Sparkles, Building2 } from 'lucide-react';
import { CheckoutModal } from '../common/CheckoutModal';
import { EnterpriseDemoModal } from './EnterpriseDemoModal';
import { useLanguage } from '../../context/language-context-def';
import { useAuth } from '../../context/auth-context-def';
import { AccountSubscriptionResponse, meetingApi } from '../../api/meetingApi';

const PENDING_CHECKOUT_PLAN_KEY = 'layameet:pending-checkout-plan';

type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'biennial';

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

interface CycleDetails {
  id: BillingCycle;
  planId: 'pro' | 'pro_quarterly' | 'pro_annual' | 'pro_2year';
  label: Record<'vi' | 'en' | 'ja', string>;
  savingsBadge?: Record<'vi' | 'en' | 'ja', string>;
  vndPerMonth: string;
  vndTotalNote: string;
  usdPerMonth: string;
  usdTotalNote: string;
  jpyPerMonth: string;
  jpyTotalNote: string;
  ctaText: Record<'vi' | 'en' | 'ja', string>;
}

const BILLING_CYCLES: CycleDetails[] = [
  {
    id: 'monthly',
    planId: 'pro',
    label: { vi: '1 Tháng', en: '1 Month', ja: '月額' },
    vndPerMonth: '99.000đ',
    vndTotalNote: 'Thanh toán theo từng tháng · Không cam kết',
    usdPerMonth: '$4.99',
    usdTotalNote: 'Billed monthly · Cancel anytime',
    jpyPerMonth: '¥680',
    jpyTotalNote: '月額請求 · いつでも解約可能',
    ctaText: { vi: 'Đăng Ký Gói Tháng (99.000đ)', en: 'Upgrade Pro ($4.99/mo)', ja: 'Pro月額プランを契約' },
  },
  {
    id: 'quarterly',
    planId: 'pro_quarterly',
    label: { vi: '1 Quý (3T)', en: 'Quarterly', ja: '四半期' },
    savingsBadge: { vi: '-10%', en: 'Save 10%', ja: '10%お得' },
    vndPerMonth: '89.667đ',
    vndTotalNote: '269.000đ / 3 tháng (Tiết kiệm 10%)',
    usdPerMonth: '$4.49',
    usdTotalNote: '$13.49 / 3 months (Save 10%)',
    jpyPerMonth: '¥610',
    jpyTotalNote: '¥1,830 / 3ヶ月 (10%お得)',
    ctaText: { vi: 'Đăng Ký Gói Quý (269.000đ)', en: 'Upgrade Quarterly ($13.49)', ja: 'Pro四半期プランを契約' },
  },
  {
    id: 'annual',
    planId: 'pro_annual',
    label: { vi: '1 Năm', en: '1 Year', ja: '年額' },
    savingsBadge: { vi: '-20%', en: 'Save 20%', ja: '20%お得' },
    vndPerMonth: '79.000đ',
    vndTotalNote: '948.000đ / 12 tháng (Tiết kiệm 20%)',
    usdPerMonth: '$3.99',
    usdTotalNote: '$47.88 / 12 months (Save 20%)',
    jpyPerMonth: '¥550',
    jpyTotalNote: '¥6,600 / 年 (20%お得)',
    ctaText: { vi: 'Đăng Ký Gói Năm (948.000đ)', en: 'Upgrade Annual ($47.88)', ja: 'Pro年額プランを契約' },
  },
  {
    id: 'biennial',
    planId: 'pro_2year',
    label: { vi: '2 Năm', en: '2 Years', ja: '2年' },
    savingsBadge: { vi: '-35%', en: 'Save 35%', ja: '35%お得' },
    vndPerMonth: '64.333đ',
    vndTotalNote: '1.544.000đ / 24 tháng (Tiết kiệm 35%)',
    usdPerMonth: '$3.25',
    usdTotalNote: '$78.00 / 24 months (Save 35%)',
    jpyPerMonth: '¥445',
    jpyTotalNote: '¥10,680 / 2年 (35%お得)',
    ctaText: { vi: 'Đăng Ký Gói 2 Năm (1.544.000đ)', en: 'Upgrade 2-Year ($78.00)', ja: 'Pro 2年プランを契約' },
  },
];

interface PricingTier {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  badge?: string;
  popular?: boolean;
  desc: string;
  priceDisplay?: string;
  priceNote: string;
  ctaText: string;
  features: string[];
}

interface PricingLanguageContent {
  badge: string;
  title: string;
  subtitle: string;
  chooseCycle: string;
  monthSuffix: string;
  assuranceTitle: string;
  assuranceText: string;
  vpsHelp: string;
  tiers: PricingTier[];
}

const PRICING_CONTENT: Record<string, PricingLanguageContent> = {
  vi: {
    badge: 'Bảng Giá Chuẩn Hóa & Minh Bạch',
    title: '3 Gói Dịch Vụ Phù Hợp Cho Mọi Quy Mô',
    subtitle: 'Bắt đầu miễn phí 100%, nâng cấp Pro Unlimited theo tháng/quý/năm để mở khóa toàn bộ tính năng và xem lại cuộc họp tương tác.',
    chooseCycle: 'Chu kỳ thanh toán Pro:',
    monthSuffix: '/ tháng',
    assuranceTitle: 'Cam kết không rủi ro:',
    assuranceText: 'Bảo mật RAM-only không lưu âm thanh bừa bãi. Hỗ trợ PoC thử nghiệm 14 ngày miễn phí cho doanh nghiệp.',
    vpsHelp: 'Cần tư vấn triển khai Private Cloud / Server riêng?',
    tiers: [
      {
        id: 'free',
        name: 'Starter',
        badge: 'Miễn Phí Vĩnh Viễn',
        desc: 'Dành cho cá nhân, freelancer và sinh viên họp trực tuyến dịch song ngữ mỗi ngày.',
        priceDisplay: '0đ',
        priceNote: 'Miễn phí 100% · Không cần thẻ ngân hàng',
        ctaText: 'Tạo Phòng Họp Ngay',
        features: [
          'Họp 1-on-1 không giới hạn thời lượng',
          'Họp nhóm (từ 3 người) tối đa 40 phút / cuộc',
          'Phụ đề AI dịch trực tiếp 50+ ngôn ngữ (<350ms)',
          'Cửa sổ phụ đề nổi (PiP) đè lên Zoom / Google Meet',
          'Tóm tắt biên bản họp & chia sẻ nhanh Zalo / Slack',
          'Xử lý âm thanh RAM-only (Không lưu file âm thanh)',
        ],
      },
      {
        id: 'pro',
        name: 'Pro Unlimited',
        badge: 'Khuyên Dùng · Tiết Kiệm 75%',
        popular: true,
        desc: 'Dành cho Freelancer chuyên nghiệp, nhóm dự án IT Outsourcing và giảng viên ngoại ngữ.',
        priceNote: 'trên mỗi tài khoản Host',
        ctaText: 'Đăng Ký Pro',
        features: [
          'Không giới hạn thời lượng cho mọi cuộc họp nhóm',
          'Không giới hạn số phút dịch thuật AI đa chiều (Any-to-Any)',
          'Tự do chọn ngôn ngữ phụ đề riêng cho từng người tham gia',
          'Laya AI tự động trích xuất Action Items & Decisions',
          'Trình xem lại cuộc họp tương tác (Replay & Scrubbing)',
          'Xuất biên bản họp tự động (Markdown / Word / PDF)',
          'Xóa watermark thương hiệu trên phụ đề & biên bản xuất ra',
          'Hỗ trợ kỹ thuật ưu tiên 24/7 qua Zalo / Slack',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise Dedicated',
        badge: 'Doanh Nghiệp & On-Premise',
        desc: 'Dành cho tập đoàn, tổ chức tài chính và doanh nghiệp cần bảo mật tuyệt đối on-premise.',
        priceDisplay: 'Từ 1.990.000đ',
        priceNote: 'Máy chủ Cloud riêng biệt 100% · Dùng thử PoC 14 ngày',
        ctaText: 'Đăng Ký PoC & Báo Giá',
        features: [
          'Cụm LiveKit Media Server riêng biệt (Dedicated / On-Premise)',
          'Cụm GPU Whisper & Laya riêng, không giới hạn băng thông',
          'Từ điển thuật ngữ & tên riêng chuyên ngành tùy biến',
          'Đăng nhập SSO / SAML / Active Directory & Audit Logs',
          'Cam kết Zero-Data-Retention & Bảo mật tuyệt đối',
          'Kỹ sư giải pháp hỗ trợ cài đặt & PoC 14 ngày miễn phí',
        ],
      },
    ],
  },
  en: {
    badge: 'Standardized & Transparent Pricing',
    title: '3 Tailored Plans for Any Scale',
    subtitle: 'Start 100% free immediately. Upgrade to Pro Unlimited across flexible cycles to unlock full features and interactive meeting replays.',
    chooseCycle: 'Pro Billing Cycle:',
    monthSuffix: '/ month',
    assuranceTitle: 'Zero-Risk Commitment:',
    assuranceText: 'RAM-only secure audio processing. 14-day risk-free PoC trial with money-back guarantee for enterprise clients.',
    vpsHelp: 'Need dedicated Private Cloud or On-Premises architecture advice?',
    tiers: [
      {
        id: 'free',
        name: 'Starter',
        badge: 'Free Forever',
        desc: 'Ideal for individuals, freelancers, and students needing daily live bilingual meetings.',
        priceDisplay: '$0',
        priceNote: '100% Free · No credit card required',
        ctaText: 'Start Meeting Now',
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
        badge: 'Recommended · 75% Cheaper',
        popular: true,
        desc: 'For global teams, IT outsourcing agencies, and cross-border project managers.',
        priceNote: 'per host account',
        ctaText: 'Upgrade to Pro',
        features: [
          'Unlimited meeting duration for all group calls',
          'Unlimited multi-directional AI translation minutes',
          'Independent subtitle language per participant',
          'Laya AI automatic Action Items & Decisions',
          'Interactive Meeting Replay & Transcript Scrubbing',
          'Instant export of meeting minutes (Markdown / Word / PDF)',
          'Brand watermark removed from subtitles & minutes',
          '24/7 priority enterprise technical support',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise Dedicated',
        badge: 'Enterprise & On-Premise',
        desc: 'For enterprises, financial institutions, and organizations requiring private cloud or on-premise deployment.',
        priceDisplay: 'From $89',
        priceNote: '100% Dedicated Private Cloud server · 14-day free PoC',
        ctaText: 'Request 14-Day PoC & Quote',
        features: [
          'Dedicated LiveKit Media Server (Private Cloud or On-Premise)',
          'Isolated GPU Whisper & Laya cluster with zero rate limits',
          'Custom domain terminology & acoustic dictionaries',
          'Enterprise SSO / SAML / Active Directory & Audit logs',
          'Custom compliance certification & Zero-Data-Retention guarantee',
          'Dedicated solutions engineer with 14-day free PoC trial',
        ],
      },
    ],
  },
  ja: {
    badge: '標準化された明確な料金体系',
    title: '規模に応じた3つの料金プラン',
    subtitle: '完全無料で今すぐ利用開始。月額/四半期/年額のPro Unlimitedで全機能とインタラクティブ会議再生を解放。',
    chooseCycle: 'Pro 請求サイクル:',
    monthSuffix: '/ 月',
    assuranceTitle: 'リスクゼロの保証:',
    assuranceText: '音声ファイルを保存しない完全RAM処理。法人向け14日間無料PoC実証実験に対応。',
    vpsHelp: '専用プライベートクラウドやオンプレミスサーバーの導入相談はこちら',
    tiers: [
      {
        id: 'free',
        name: 'スターター',
        badge: '永久無料',
        desc: '個人、フリーランス、学生向けのリアルタイム多言語ミーティング。',
        priceDisplay: '¥0',
        priceNote: '完全無料 · クレジットカード登録不要',
        ctaText: '今すぐ会議を作成',
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
        name: 'Pro Unlimited',
        badge: 'おすすめ · Zoom比75%低コスト',
        popular: true,
        desc: 'IT受託開発チーム、海外拠点との定期ミーティング、語学教育機関向け。',
        priceNote: '1ホストあたり',
        ctaText: 'Proプランを契約',
        features: [
          'すべてのグループ会議で時間無制限',
          '双方向AI多言語翻訳が無制限',
          '参加者ごとに自由な字幕言語選択',
          'Laya AIによる決定事項・タスク自動抽出',
          'インタラクティブ会議再生・タイムスタンプ同期プレーヤー',
          '議事録自動エクスポート (Markdown / Word / PDF)',
          '字幕および議事録の透かし削除',
          '24/7優先テクニカルサポート',
        ],
      },
      {
        id: 'enterprise',
        name: 'エンタープライズ',
        badge: '専用サーバー & オンプレミス',
        desc: '金融機関、大企業、最高水準のセキュリティと社内閉域網を必要とする組織向け。',
        priceDisplay: '月額 ¥12,800〜',
        priceNote: '100% 専用プライベートクラウド・14日間無料PoC付き',
        ctaText: '14日間PoC・お見積り申込',
        features: [
          '専用LiveKitメディアサーバー（自社クラウド / オンプレミス）',
          '専用Whisper & Laya GPUクラスター（帯域無制限）',
          '企業特有の専門用語・社内略語のカスタム辞書',
          'SSO / SAML / Active Directory連携および監査ログ',
          'データ非保持（Zero-Data-Retention）保証',
          '専任ソリューションエンジニアによる14日間無料PoC実証支援',
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
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('annual');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<AccountSubscriptionResponse | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const langKey = language === 'ja' ? 'ja' : language === 'en' ? 'en' : 'vi';
  const content = PRICING_CONTENT[langKey] || PRICING_CONTENT.vi;
  const accountCopy = ACCOUNT_COPY[langKey] || ACCOUNT_COPY.vi;

  const isAnnual = selectedCycle === 'annual';
  const currentCycle = BILLING_CYCLES.find((c) => c.id === selectedCycle) || BILLING_CYCLES[2];

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
      if (!pendingPlan) return;

      const matchedCycle = BILLING_CYCLES.find((c) => c.planId === pendingPlan);
      if (matchedCycle) {
        setSelectedCycle(matchedCycle.id);
        setIsCheckoutOpen(true);
      }
      window.sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
    } catch {
      // The user can still open checkout manually when sessionStorage is unavailable.
    }
  }, [user?.email]);

  const handleAccountNoteSignIn = async () => {
    setAccountError(null);
    try {
      window.sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, currentCycle.planId);
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

  const getProPriceDisplay = () => {
    if (langKey === 'en') return currentCycle.usdPerMonth;
    if (langKey === 'ja') return currentCycle.jpyPerMonth;
    return currentCycle.vndPerMonth;
  };

  const getProNoteDisplay = () => {
    if (langKey === 'en') return currentCycle.usdTotalNote;
    if (langKey === 'ja') return currentCycle.jpyTotalNote;
    return currentCycle.vndTotalNote;
  };

  return (
    <section id="pricing" className="border-t border-zinc-200 dark:border-[#2e2e30] py-16 md:py-24 relative overflow-hidden bg-white/40 dark:bg-[#0f0f10]/40 transition-colors">
      <div className="max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{content.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            {content.title}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {content.subtitle}
          </p>

          {/* Pro Billing Cycle Selector Bar */}
          <div className="pt-4 flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {content.chooseCycle}
            </span>
            <div className="inline-flex items-center p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-inner max-w-full overflow-x-auto">
              {BILLING_CYCLES.map((cycle) => {
                const isActive = cycle.id === selectedCycle;
                return (
                  <button
                    key={cycle.id}
                    type="button"
                    onClick={() => setSelectedCycle(cycle.id)}
                    className={`relative min-h-[38px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{cycle.label[langKey]}</span>
                    {cycle.savingsBadge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {cycle.savingsBadge[langKey]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
                    : 'Starter (Free)'}
              </strong>
            </div>
          </div>
        )}

        {/* 3-Column Standardized Pricing Cards Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {content.tiers.map((tier) => {
            const isPro = tier.id === 'pro';
            const isEnterprise = tier.id === 'enterprise';

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  isPro
                    ? 'bg-white dark:bg-[#18181b] border-2 border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/20'
                    : 'bg-white/80 dark:bg-[#151517] border border-zinc-200 dark:border-[#2e2e30] hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                }`}
              >
                {/* Badge Pill */}
                {tier.badge && (
                  <div className={`absolute -top-3 ${isPro ? 'left-1/2 -translate-x-1/2' : isEnterprise ? 'right-6' : 'left-6'}`}>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-xs whitespace-nowrap flex items-center gap-1 ${
                        isPro
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : isEnterprise
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {isPro && <Sparkles className="w-3 h-3" />}
                      {isEnterprise && <Building2 className="w-3 h-3" />}
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="mb-4 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-zinc-950 dark:text-white">
                        {tier.name}
                      </h3>
                      {isPro && currentCycle.savingsBadge && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {currentCycle.savingsBadge[langKey]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 min-h-[32px]">
                      {tier.desc}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="py-4 border-y border-zinc-100 dark:border-zinc-800/80 mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-zinc-950 dark:text-white font-mono">
                        {isPro ? getProPriceDisplay() : tier.priceDisplay}
                      </span>
                      {(isPro || (isEnterprise && tier.priceDisplay && !tier.priceDisplay.includes('¥'))) && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {content.monthSuffix}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] block mt-1 ${
                        isPro ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {isPro ? getProNoteDisplay() : tier.priceNote}
                    </span>
                    {isPro && (
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                        {tier.priceNote}
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2.5 mb-6 text-xs text-zinc-700 dark:text-zinc-300">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isPro
                              ? 'text-blue-600 dark:text-blue-400'
                              : isEnterprise
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
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
                    className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isPro
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25'
                        : isEnterprise
                        ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                        : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span>{isPro ? currentCycle.ctaText[langKey] : tier.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {!user && isPro && (
                    <button
                      type="button"
                      onClick={() => void handleAccountNoteSignIn()}
                      className="mt-2 w-full text-center text-[11px] leading-relaxed text-zinc-500 underline-offset-2 hover:text-blue-600 hover:underline dark:text-zinc-400 dark:hover:text-blue-400 cursor-pointer"
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
          <p role="alert" className="mx-auto mt-4 max-w-4xl text-center text-xs text-red-600 dark:text-red-400">
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
