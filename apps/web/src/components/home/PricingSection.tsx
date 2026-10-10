import React, { useCallback, useEffect, useState } from 'react';
import { Check, ArrowRight, ExternalLink } from 'lucide-react';
import { CheckoutModal } from '../common/CheckoutModal';
import { EnterpriseDemoModal } from './EnterpriseDemoModal';
import { useLanguage } from '../../context/language-context-def';
import { useAuth } from '../../context/auth-context-def';
import { AccountSubscriptionResponse, meetingApi } from '../../api/meetingApi';
import {
  VisaIcon,
  MastercardIcon,
  JcbIcon,
  AmexIcon,
  DiscoverIcon,
  UnionPayIcon,
  ApplePayIcon,
  GooglePayIcon,
} from '../common/PaymentMethodIcons';

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
    label: { vi: 'Theo tháng', en: 'Monthly', ja: '月額' },
    vndPerMonth: '99.000đ',
    vndTotalNote: 'Thanh toán hàng tháng · Tự động gia hạn',
    usdPerMonth: '$4.99',
    usdTotalNote: 'Billed monthly · Auto-renews',
    jpyPerMonth: '¥680',
    jpyTotalNote: '月額請求 · 自動更新',
    ctaText: { vi: 'Nâng cấp gói Pro', en: 'Upgrade plan', ja: 'プランをアップグレード' },
  },
  {
    id: 'quarterly',
    planId: 'pro_quarterly',
    label: { vi: 'Gói Quý (3T)', en: 'Quarterly', ja: '四半期' },
    savingsBadge: { vi: '-10%', en: 'Save 10%', ja: '10%お得' },
    vndPerMonth: '89.667đ',
    vndTotalNote: '269.000đ / 3 tháng (Tiết kiệm 10%)',
    usdPerMonth: '$4.49',
    usdTotalNote: '$13.49 / 3 months (Save 10%)',
    jpyPerMonth: '¥610',
    jpyTotalNote: '¥1,830 / 3ヶ月 (10%お得)',
    ctaText: { vi: 'Nâng cấp gói Quý', en: 'Upgrade plan', ja: 'プランをアップグレード' },
  },
  {
    id: 'annual',
    planId: 'pro_annual',
    label: { vi: 'Theo năm', en: 'Yearly', ja: '年額' },
    savingsBadge: { vi: 'Tiết kiệm 20%', en: 'Save 20%', ja: '20%お得' },
    vndPerMonth: '79.000đ',
    vndTotalNote: '948.000đ / 12 tháng (Tiết kiệm 20%)',
    usdPerMonth: '$3.99',
    usdTotalNote: '$47.88 / 12 months (Save 20%)',
    jpyPerMonth: '¥550',
    jpyTotalNote: '¥6,600 / 年 (20%お得)',
    ctaText: { vi: 'Nâng cấp gói Pro', en: 'Upgrade plan', ja: 'プランをアップグレード' },
  },
  {
    id: 'biennial',
    planId: 'pro_2year',
    label: { vi: 'Gói 2 Năm', en: '2 Years', ja: '2年' },
    savingsBadge: { vi: 'Tiết kiệm 35%', en: 'Save 35%', ja: '35%お得' },
    vndPerMonth: '64.333đ',
    vndTotalNote: '1.544.000đ / 24 tháng (Tiết kiệm 35%)',
    usdPerMonth: '$3.25',
    usdTotalNote: '$78.00 / 24 months (Save 35%)',
    jpyPerMonth: '¥445',
    jpyTotalNote: '¥10,680 / 2年 (35%お得)',
    ctaText: { vi: 'Nâng cấp 2 Năm', en: 'Upgrade plan', ja: 'プランをアップグレード' },
  },
];

interface PricingTier {
  id: 'free' | 'pro' | 'pro_plus' | 'enterprise';
  name: string;
  badge?: string;
  popular?: boolean;
  desc: string;
  tagline: string;
  priceMonthlyUsd: string;
  priceMonthlyVnd: string;
  priceMonthlyJpy: string;
  priceAnnualUsd: string;
  priceAnnualVnd: string;
  priceAnnualJpy: string;
  periodMonthly: string;
  periodAnnual: string;
  ctaText: string;
  features: string[];
}

interface PricingLanguageContent {
  title: string;
  enterpriseLinkText: string;
  enterpriseLinkPrompt: string;
  recommendedBadge: string;
  paymentMethodsSupported: string;
  tiers: PricingTier[];
}

const PRICING_CONTENT: Record<string, PricingLanguageContent> = {
  vi: {
    title: 'Bảng Giá & Gói Dịch Vụ',
    enterpriseLinkPrompt: 'Tìm kiếm giải pháp cho doanh nghiệp hoặc máy chủ riêng?',
    enterpriseLinkText: 'Liên hệ tư vấn On-Premise',
    recommendedBadge: 'Khuyên Dùng',
    paymentMethodsSupported: 'Hỗ trợ đa dạng phương thức thanh toán an toàn',
    tiers: [
      {
        id: 'free',
        name: 'Lite',
        tagline: 'Khởi đầu dễ dàng',
        desc: 'Dành cho cá nhân và sinh viên cần họp song ngữ cơ bản mỗi ngày.',
        priceMonthlyUsd: '$0',
        priceMonthlyVnd: '0đ',
        priceMonthlyJpy: '¥0',
        priceAnnualUsd: '$0',
        priceAnnualVnd: '0đ',
        priceAnnualJpy: '¥0',
        periodMonthly: 'mỗi tháng, miễn phí trọn đời',
        periodAnnual: 'mỗi tháng, miễn phí trọn đời',
        ctaText: 'Bắt đầu miễn phí',
        features: [
          'Họp 1-on-1 không giới hạn thời lượng',
          'Họp nhóm (từ 3 người) tối đa 40 phút / cuộc',
          'Phụ đề AI dịch trực tiếp 50+ ngôn ngữ (<350ms)',
          'Cửa sổ phụ đề nổi (PiP) đè Zoom & Google Meet',
          'Tóm tắt biên bản họp tự động chia sẻ Zalo / Slack',
          'Bảo mật RAM-only (Không lưu trữ file âm thanh)',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        badge: 'Khuyên Dùng',
        popular: true,
        tagline: 'Bao gồm mọi tính năng Lite, cộng thêm:',
        desc: 'Dành cho Freelancer chuyên nghiệp, kỹ sư IT và giảng viên ngoại ngữ.',
        priceMonthlyUsd: '$4.99',
        priceMonthlyVnd: '99.000đ',
        priceMonthlyJpy: '¥680',
        priceAnnualUsd: '$3.99',
        priceAnnualVnd: '79.000đ',
        priceAnnualJpy: '¥550',
        periodMonthly: 'mỗi tháng, tự động gia hạn',
        periodAnnual: 'mỗi tháng, trả theo năm ($47.88)',
        ctaText: 'Nâng cấp gói Pro',
        features: [
          'Không giới hạn thời lượng mọi cuộc họp nhóm',
          'Không giới hạn số phút dịch AI thời gian thực',
          'Tự do chọn ngôn ngữ phụ đề riêng từng người tham gia',
          'Laya AI tự động trích xuất Action Items & Decisions',
          'Trình xem lại cuộc họp tương tác (Replay & Scrubbing)',
          'Xuất biên bản họp tức thì (Markdown / Word / PDF)',
          'Xóa watermark thương hiệu trên phụ đề & biên bản',
          'Hỗ trợ kỹ thuật ưu tiên 24/7 qua Zalo / Slack',
        ],
      },
      {
        id: 'pro_plus',
        name: 'Pro+',
        tagline: 'Bao gồm mọi tính năng Pro, cộng thêm:',
        desc: 'Dành cho nhóm dự án IT Outsourcing và văn phòng đa quốc gia.',
        priceMonthlyUsd: '$12.99',
        priceMonthlyVnd: '269.000đ',
        priceMonthlyJpy: '¥1,830',
        priceAnnualUsd: '$9.99',
        priceAnnualVnd: '215.000đ',
        priceAnnualJpy: '¥1,480',
        periodMonthly: 'mỗi tháng, tự động gia hạn',
        periodAnnual: 'mỗi tháng, trả theo năm ($119.88)',
        ctaText: 'Nâng cấp gói Pro+',
        features: [
          '3 Tài khoản Host Pro độc lập cho nhóm dự án',
          'Từ điển thuật ngữ & tên riêng chuyên ngành tùy biến',
          '50GB lưu trữ Replay cuộc họp đám mây bảo mật',
          'Kênh GPU dịch thuật ưu tiên cao nhất (<200ms)',
          'Bảng điều khiển quản lý hạn mức thành viên nhóm',
          'Hỗ trợ họp đa kênh song song không giới hạn',
        ],
      },
      {
        id: 'enterprise',
        name: 'Ultra',
        tagline: 'Bao gồm mọi tính năng Pro+, cộng thêm:',
        desc: 'Dành cho tập đoàn, tổ chức tài chính và doanh nghiệp cần On-Premise.',
        priceMonthlyUsd: '$89+',
        priceMonthlyVnd: 'Từ 1.990.000đ',
        priceMonthlyJpy: '¥12,800+',
        priceAnnualUsd: '$89+',
        priceAnnualVnd: 'Từ 1.990.000đ',
        priceAnnualJpy: '¥12,800+',
        periodMonthly: 'máy chủ Private Cloud / On-Premise',
        periodAnnual: 'máy chủ Private Cloud / On-Premise',
        ctaText: 'Liên hệ tư vấn',
        features: [
          'Cụm LiveKit Media Server riêng biệt (Dedicated / On-Premise)',
          'Cụm GPU Whisper & Laya riêng, không giới hạn băng thông',
          'Đăng nhập SSO / SAML / Active Directory & Audit logs',
          'Cam kết Zero-Data-Retention & Bảo mật tuyệt đối',
          'Kỹ sư giải pháp hỗ trợ cài đặt & PoC 14 ngày miễn phí',
          'SLA cam kết độ sẵn sàng dịch vụ 99.99%',
        ],
      },
    ],
  },
  en: {
    title: 'Pricing',
    enterpriseLinkPrompt: 'Looking for enterprise solutions?',
    enterpriseLinkText: 'Contact us via Enterprise PoC',
    recommendedBadge: 'Recommended',
    paymentMethodsSupported: 'Most payment methods supported for upgrade',
    tiers: [
      {
        id: 'free',
        name: 'Lite',
        tagline: 'To get started',
        desc: 'For individuals and students needing daily live bilingual meetings.',
        priceMonthlyUsd: '$0',
        priceMonthlyVnd: '0đ',
        priceMonthlyJpy: '¥0',
        priceAnnualUsd: '$0',
        priceAnnualVnd: '0đ',
        priceAnnualJpy: '¥0',
        periodMonthly: 'per month, free forever',
        periodAnnual: 'per month, free forever',
        ctaText: 'Get started free',
        features: [
          'Unlimited 1-on-1 meeting duration',
          'Group meetings (3+ participants) up to 40 mins',
          'Live AI subtitles in 50+ languages (<350ms)',
          'Picture-in-Picture (PiP) overlay on Zoom & Google Meet',
          'Meeting minutes summary & quick export to Slack/Email',
          '100% RAM-only zero audio storage security',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        badge: 'Recommended',
        popular: true,
        tagline: 'Everything in Lite, plus:',
        desc: 'For professionals, global teams, and online language educators.',
        priceMonthlyUsd: '$4.99',
        priceMonthlyVnd: '99.000đ',
        priceMonthlyJpy: '¥680',
        priceAnnualUsd: '$3.99',
        priceAnnualVnd: '79.000đ',
        priceAnnualJpy: '¥550',
        periodMonthly: 'per month, auto-renews',
        periodAnnual: 'per month, billed annually ($47.88)',
        ctaText: 'Upgrade plan',
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
        id: 'pro_plus',
        name: 'Pro+',
        tagline: 'Everything in Pro, plus:',
        desc: 'For IT outsourcing agencies and multi-regional project teams.',
        priceMonthlyUsd: '$12.99',
        priceMonthlyVnd: '269.000đ',
        priceMonthlyJpy: '¥1,830',
        priceAnnualUsd: '$9.99',
        priceAnnualVnd: '215.000đ',
        priceAnnualJpy: '¥1,480',
        periodMonthly: 'per month, auto-renews',
        periodAnnual: 'per month, billed annually ($119.88)',
        ctaText: 'Upgrade plan',
        features: [
          'Up to 3 concurrent independent Host licenses',
          'Custom domain terminology & acoustic dictionaries',
          '50GB secure encrypted cloud meeting replay storage',
          'Dedicated highest-priority GPU translation channel',
          'Centralized team workspace and member management',
          'Unlimited simultaneous group meeting rooms',
        ],
      },
      {
        id: 'enterprise',
        name: 'Ultra',
        tagline: 'Everything in Pro+, plus:',
        desc: 'For enterprises and institutions requiring on-premise architecture.',
        priceMonthlyUsd: '$89+',
        priceMonthlyVnd: 'From 1.990.000đ',
        priceMonthlyJpy: '¥12,800+',
        priceAnnualUsd: '$89+',
        priceAnnualVnd: 'From 1.990.000đ',
        priceAnnualJpy: '¥12,800+',
        periodMonthly: 'dedicated private cloud / on-premise',
        periodAnnual: 'dedicated private cloud / on-premise',
        ctaText: 'Contact sales',
        features: [
          'Dedicated LiveKit Media Server (Private Cloud or On-Premise)',
          'Isolated GPU Whisper & Laya cluster with zero rate limits',
          'Enterprise SSO / SAML / Active Directory & Audit logs',
          'Custom compliance & Zero-Data-Retention guarantee',
          'Dedicated solutions engineer with 14-day free PoC trial',
          '99.99% service level agreement (SLA) guarantee',
        ],
      },
    ],
  },
  ja: {
    title: '料金プラン',
    enterpriseLinkPrompt: 'エンタープライズまたは専用サーバーの導入をお考えですか？',
    enterpriseLinkText: 'オンプレミス導入相談はこちら',
    recommendedBadge: 'おすすめ',
    paymentMethodsSupported: '多様な安全な決済方法に対応',
    tiers: [
      {
        id: 'free',
        name: 'Lite',
        tagline: '今すぐ無料で開始',
        desc: '個人、フリーランス、学生向けのリアルタイム多言語ミーティング。',
        priceMonthlyUsd: '$0',
        priceMonthlyVnd: '0đ',
        priceMonthlyJpy: '¥0',
        priceAnnualUsd: '$0',
        priceAnnualVnd: '0đ',
        priceAnnualJpy: '¥0',
        periodMonthly: '月額、永久無料',
        periodAnnual: '月額、永久無料',
        ctaText: '無料で始める',
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
        name: 'Pro',
        badge: 'おすすめ',
        popular: true,
        tagline: 'Liteの全機能に加え:',
        desc: 'グローバルチーム、IT開発者、語学教育機関向け。',
        priceMonthlyUsd: '$4.99',
        priceMonthlyVnd: '99.000đ',
        priceMonthlyJpy: '¥680',
        priceAnnualUsd: '$3.99',
        priceAnnualVnd: '79.000đ',
        priceAnnualJpy: '¥550',
        periodMonthly: '月額自動更新',
        periodAnnual: '月額換算、年額請求 (¥6,600/年)',
        ctaText: 'プランをアップグレード',
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
        id: 'pro_plus',
        name: 'Pro+',
        tagline: 'Proの全機能に加え:',
        desc: '海外受託開発チームおよび複数プロジェクト向け。',
        priceMonthlyUsd: '$12.99',
        priceMonthlyVnd: '269.000đ',
        priceMonthlyJpy: '¥1,830',
        priceAnnualUsd: '$9.99',
        priceAnnualVnd: '215.000đ',
        priceAnnualJpy: '¥1,480',
        periodMonthly: '月額自動更新',
        periodAnnual: '月額換算、年額請求 (¥16,800/年)',
        ctaText: 'プランをアップグレード',
        features: [
          '最大3名の独立ホストライセンス',
          '企業特有の専門用語・社内略語のカスタム辞書',
          '50GB 暗号化クラウド会議録画・再生ストレージ',
          '最優先GPU翻訳チャネル (<200ms)',
          'チームメンバー管理ダッシュボード',
          '無制限の同時進行会議ルーム',
        ],
      },
      {
        id: 'enterprise',
        name: 'Ultra',
        tagline: 'Pro+の全機能に加え:',
        desc: '最高水準のセキュリティと社内閉域網を必要とする企業向け。',
        priceMonthlyUsd: '$89+',
        priceMonthlyVnd: '1.990.000đ〜',
        priceMonthlyJpy: '¥12,800〜',
        priceAnnualUsd: '$89+',
        priceAnnualVnd: '1.990.000đ〜',
        priceAnnualJpy: '¥12,800〜',
        periodMonthly: '専用プライベートクラウド / オンプレミス',
        periodAnnual: '専用プライベートクラウド / オンプレミス',
        ctaText: 'お問い合わせ',
        features: [
          '専用LiveKitメディアサーバー（自社クラウド / オンプレミス）',
          '専用Whisper & Laya GPUクラスター（帯域無制限）',
          'SSO / SAML / Active Directory連携および監査ログ',
          'データ非保持（Zero-Data-Retention）保証',
          '専任ソリューションエンジニアによる14日間無料PoC実証支援',
          '99.99% SLA稼働率保証',
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

  const isAnnual = selectedCycle === 'annual' || selectedCycle === 'biennial';
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

  const getPriceDisplay = (tier: PricingTier) => {
    if (isAnnual) {
      if (langKey === 'en') return tier.priceAnnualUsd;
      if (langKey === 'ja') return tier.priceAnnualJpy;
      return tier.priceAnnualVnd;
    }
    if (langKey === 'en') return tier.priceMonthlyUsd;
    if (langKey === 'ja') return tier.priceMonthlyJpy;
    return tier.priceMonthlyVnd;
  };

  const getPeriodDisplay = (tier: PricingTier) => {
    return isAnnual ? tier.periodAnnual : tier.periodMonthly;
  };

  return (
    <section id="pricing" className="py-10 sm:py-16 md:py-20 relative overflow-hidden transition-colors bg-[#08080a] text-zinc-100">
      {/* Background Subtle Tech Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 sm:mb-14">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            {content.title}
          </h2>

          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-zinc-400">
            <span>{content.enterpriseLinkPrompt}</span>
            <button
              type="button"
              onClick={handleEnterpriseClick}
              className="text-white hover:text-[#00e676] font-semibold underline-offset-4 hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{content.enterpriseLinkText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TRAE Style Segmented Billing Switcher */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#141418] border border-zinc-800 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedCycle('monthly')}
                className={`min-h-[38px] px-6 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  !isAnnual
                    ? 'bg-[#26262c] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {langKey === 'ja' ? '月額' : langKey === 'en' ? 'Monthly' : 'Theo tháng'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCycle('annual')}
                className={`min-h-[38px] px-6 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isAnnual
                    ? 'bg-[#26262c] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{langKey === 'ja' ? '年額' : langKey === 'en' ? 'Yearly' : 'Theo năm'}</span>
                <span className="text-[#00e676] font-bold">
                  {langKey === 'ja' ? '20%お得' : langKey === 'en' ? 'Save 20%' : 'Tiết kiệm 20%'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Signed-in Account Info Pill */}
        {user?.email && (
          <div className="mx-auto mb-8 flex max-w-4xl justify-center">
            <div className="rounded-full border border-zinc-800 bg-[#121215] px-4 py-2 text-xs font-normal text-zinc-300">
              {accountCopy.signedIn}: <strong className="text-white">{user.email}</strong>
              {' · '}
              {accountCopy.currentPlan}:{' '}
              <strong className="text-[#00e676]">
                {subscriptionLoading
                  ? accountCopy.checking
                  : subscription?.isPro
                    ? 'Pro Unlimited'
                    : 'Starter (Free)'}
              </strong>
            </div>
          </div>
        )}

        {/* TRAE Style 4-Column Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch max-w-7xl mx-auto">
          {content.tiers.map((tier) => {
            const isPro = tier.id === 'pro';

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 overflow-hidden ${
                  isPro
                    ? 'bg-[#0e0e12] border-2 border-[#00e676] shadow-[0_0_35px_rgba(0,230,118,0.12)] ring-1 ring-[#00e676]/30'
                    : 'bg-[#0f0f13] border border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                {/* TRAE Corner Cyber Dot Matrix Texture */}
                <div className="pointer-events-none absolute top-0 right-0 w-32 h-32 overflow-hidden rounded-tr-2xl opacity-20">
                  <div className="w-full h-full bg-[radial-gradient(#00e676_1.5px,transparent_1.5px)] [background-size:10px_10px]" />
                </div>

                <div>
                  {/* Card Title & Recommended Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className={`text-lg font-bold tracking-tight ${
                        isPro ? 'text-[#00e676]' : 'text-white'
                      }`}
                    >
                      {tier.name}
                    </h3>
                    {isPro && (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-[#00e676] text-[#00e676] bg-[#00e676]/10 tracking-wide">
                        {content.recommendedBadge}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight">
                        {getPriceDisplay(tier)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 font-normal">
                      {getPeriodDisplay(tier)}
                    </p>
                    <p className="text-xs text-zinc-300 font-medium mt-2">
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-8 pt-3 text-xs text-zinc-300 border-t border-zinc-800/80">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#00e676]" />
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
                      } else if (tier.id === 'pro_plus') {
                        setIsCheckoutOpen(true);
                      } else if (tier.id === 'enterprise') {
                        handleEnterpriseClick();
                      } else if (onSelectTier) {
                        onSelectTier(tier.id);
                      }
                    }}
                    className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isPro
                        ? 'bg-[#00e676] hover:bg-[#00c853] text-black font-bold shadow-[0_0_20px_rgba(0,230,118,0.3)]'
                        : 'bg-[#202025] hover:bg-[#28282f] text-white border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {!user && isPro && (
                    <button
                      type="button"
                      onClick={() => void handleAccountNoteSignIn()}
                      className="mt-2 w-full text-center text-[11px] leading-relaxed text-zinc-500 underline-offset-2 hover:text-[#00e676] hover:underline cursor-pointer"
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
          <p role="alert" className="mx-auto mt-4 max-w-4xl text-center text-xs text-red-400">
            {accountError}
          </p>
        )}

        {/* TRAE Style Supported Payment Methods Footer Bar */}
        <div className="mt-16 sm:mt-20 text-center space-y-4">
          <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">
            {content.paymentMethodsSupported}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-3xl mx-auto px-4 opacity-90 hover:opacity-100 transition-opacity">
            <VisaIcon className="h-6 w-auto" />
            <MastercardIcon className="h-6 w-auto" />
            <AmexIcon className="h-6 w-auto" />
            <JcbIcon className="h-6 w-auto" />
            <DiscoverIcon className="h-6 w-auto" />
            <UnionPayIcon className="h-6 w-auto" />
            <ApplePayIcon className="h-6 w-auto" />
            <GooglePayIcon className="h-6 w-auto" />
          </div>
        </div>

        {/* Wired Modals */}
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
