import { AdaptiveDialog } from '../components/common/AdaptiveDialog';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { meetingApi } from '../api/meetingApi';
import {
  Plus,
  ArrowRight,
  ShieldCheck,
  Globe,
  Mic,
  FileText,
  Building2,
  X,
  Settings,
  HelpCircle,
  Sparkles,
  Video,
  Keyboard,
  Code2,
  SunMoon,
  Check,
  Clock,
  Layers,
  Zap,
  Home,
  CreditCard,
  Phone,
  ChevronLeft,
  Calendar,
  Sliders,
  BookOpen,
} from 'lucide-react';
import { admissionStorage } from '../utils/admissionStorage';
import { SystemStatusModal } from '../components/system/SystemStatusModal';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { InteractiveMeetingPreview } from '../components/home/InteractiveMeetingPreview';
import { PricingSection } from '../components/home/PricingSection';
import { FAQSection } from '../components/home/FAQSection';
import { ContactSection } from '../components/home/ContactSection';
import { LegalModal } from '../components/common/LegalModal';
import { EnterpriseSsoModal } from '../components/home/EnterpriseSsoModal';
import { useLanguage } from '../context/language-context-def';
import { useAuth } from '../context/auth-context-def';
import { AppLanguage } from '../i18n';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { NeuralLinguisticBackground } from '../components/common/NeuralLinguisticBackground';
import { CountryFlag } from '../components/common/CountryFlag';
import { GoogleAuthControl } from '../components/auth/GoogleAuthControl';
import { ScheduleMeetingModal } from '../components/home/ScheduleMeetingModal';
import { CalendarScheduleModal } from '../components/home/CalendarScheduleModal';
import { SystemToolSettingsModal } from '../components/home/SystemToolSettingsModal';
import { UpcomingMeetingsStrip } from '../components/home/UpcomingMeetingsStrip';
import { MeetingHistoryModal } from '../components/MeetingHistoryModal';

const UI_LANGUAGE_CARDS: { code: AppLanguage; label: string; native: string; flag: string; pairHint: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', native: 'Tiếng Việt', flag: '🇻🇳', pairHint: '🇻🇳 VI ↔ 🇯🇵 JA / 🇺🇸 EN' },
  { code: 'ja', label: 'Tiếng Nhật', native: '日本語', flag: '🇯🇵', pairHint: '🇯🇵 JA ↔ 🇻🇳 VI / 🇺🇸 EN' },
  { code: 'en', label: 'Tiếng Anh', native: 'English', flag: '🇺🇸', pairHint: '🇺🇸 EN ↔ 🇻🇳 VI / 🇯🇵 JA' },
];

const HOME_UI = {
  vi: {
    joinShort: 'Vào',
    newMeetingFab: 'Mới',
    mobileHelpText: 'Nhấn nút Mới ở góc dưới để tạo phòng họp hoặc nhập mã phòng trên thanh tìm kiếm.',
    ramOnlyBadge: 'Bảo mật RAM-Only',
    ramOnlyFull: '100% RAM-Only • Không lưu file âm thanh',
    navDrawerTitle: 'Menu điều hướng LayaMeet',
    drawerGroupMain: 'Điều hướng chính',
    drawerGroupDev: 'Kỹ thuật & Tích hợp',
    drawerGroupSys: 'Hệ thống & Cài đặt',
    privacyNav: 'Quyền riêng tư trong LayaMeet',
    settingsNav: 'Cài đặt & Giao diện',
    pricingNav: 'Gói dịch vụ & Tính năng AI',
    helpNav: 'Trợ giúp & FAQ',
    contactNav: 'Tư vấn On-Premise',
    accountSheetTitle: 'Thiết lập ngôn ngữ và giao diện',
    langDisplayHeader: 'Ngôn ngữ hiển thị & Dịch AI',
    proUpgradeTitle: 'Nâng cấp gói LayaMeet Pro Unlimited',
    proUpgradeSub: 'Họp không giới hạn thời lượng & Từ điển doanh nghiệp',
    themeToggleLabel: 'Giao diện Sáng / Tối',
    systemStatusLabel: 'Trạng thái hệ thống',
    privacyLink: 'Chính sách quyền riêng tư',
    termsLink: 'Điều khoản dịch vụ',
    tabFeatures: 'Tính Năng',
    tabPricing: 'Bảng Giá',
    tabFaq: 'Hỏi Đáp',
    tabContact: 'Tư Vấn On-Prem',
    closeDrawer: 'Đóng',
    minimalFooterBadge: '100% RAM-Only · Zero Raw Audio',
    enterRoomPrompt: 'Vui lòng nhập mã phòng họp.',
    createMeetingFailed: 'Không thể tạo phòng họp',
    drawerBadge: 'Chi Tiết & Thông Tin Nền Tảng',
    railHome: 'Trang chủ',
    railFeatures: 'Tính năng',
    railPricing: 'Bảng giá',
    railFaq: 'Hỏi đáp',
    railContact: 'Tư vấn',
    railDevelopers: 'API & Dev',
    backToHome: 'Quay lại trang chủ',
    calendarNav: 'Lịch cuộc họp',
    historyNav: 'Lịch sử cuộc họp',
    toolsNav: 'Cài đặt AI & API Key',
    blogNav: 'Cẩm Nang & Blog',
  },
  en: {
    joinShort: 'Join',
    newMeetingFab: 'New',
    mobileHelpText: 'Tap New below to create an instant meeting or enter a room code above.',
    ramOnlyBadge: 'RAM-Only Security',
    ramOnlyFull: '100% RAM-Only • Zero Raw Audio Storage',
    navDrawerTitle: 'LayaMeet Navigation Menu',
    drawerGroupMain: 'Main Navigation',
    drawerGroupDev: 'Developers & Integration',
    drawerGroupSys: 'System & Preferences',
    privacyNav: 'Privacy in LayaMeet',
    settingsNav: 'Settings & Appearance',
    pricingNav: 'Pricing & AI Features',
    helpNav: 'Help & FAQ',
    contactNav: 'Enterprise On-Premise',
    accountSheetTitle: 'Language and Preferences',
    langDisplayHeader: 'Display & AI Subtitle Language',
    proUpgradeTitle: 'Upgrade to LayaMeet Pro Unlimited',
    proUpgradeSub: 'Unlimited meeting duration & enterprise dictionary',
    themeToggleLabel: 'Appearance: Light / Dark',
    systemStatusLabel: 'System Status',
    privacyLink: 'Privacy Policy',
    termsLink: 'Terms of Service',
    tabFeatures: 'Features',
    tabPricing: 'Pricing',
    tabFaq: 'FAQ',
    tabContact: 'Enterprise On-Prem',
    closeDrawer: 'Close',
    minimalFooterBadge: '100% RAM-Only · Zero Raw Audio',
    enterRoomPrompt: 'Please enter a room code.',
    createMeetingFailed: 'Failed to create meeting',
    drawerBadge: 'Platform Details & Specs',
    railHome: 'Home',
    railFeatures: 'Features',
    railPricing: 'Pricing',
    railFaq: 'FAQ',
    railContact: 'Contact',
    railDevelopers: 'API & Dev',
    backToHome: 'Back to home',
    calendarNav: 'Meeting Calendar',
    historyNav: 'Meeting History',
    toolsNav: 'AI & API Key Settings',
    blogNav: 'Guides & Blog',
  },
  ja: {
    joinShort: '参加',
    newMeetingFab: '新規',
    mobileHelpText: '下の「新規」ボタンで会議を作成するか、上の検索バーにルームコードを入力してください。',
    ramOnlyBadge: '完全RAM処理',
    ramOnlyFull: '完全RAM-only • 音声ファイル保存ゼロ',
    navDrawerTitle: 'LayaMeet ナビゲーションメニュー',
    drawerGroupMain: 'メインナビゲーション',
    drawerGroupDev: '開発者 & 連携',
    drawerGroupSys: 'システムと設定',
    privacyNav: 'LayaMeetのプライバシー',
    settingsNav: '設定・外観',
    pricingNav: '料金プラン & AI機能',
    helpNav: 'ヘルプ & FAQ',
    contactNav: 'オンプレミス導入相談',
    accountSheetTitle: '言語と環境設定',
    langDisplayHeader: '表示言語 & AI字幕言語',
    proUpgradeTitle: 'LayaMeet Pro 無制限プランへアップグレード',
    proUpgradeSub: '会議時間無制限 & 企業専用カスタム辞書',
    themeToggleLabel: '外観: ライト / ダーク',
    systemStatusLabel: 'システム状態',
    privacyLink: 'プライバシーポリシー',
    termsLink: '利用規約',
    tabFeatures: '機能一覧',
    tabPricing: '料金プラン',
    tabFaq: 'よくある質問',
    tabContact: 'オンプレミス導入',
    closeDrawer: '閉じる',
    minimalFooterBadge: '完全RAMメモリ処理 · 音声保存なし',
    enterRoomPrompt: 'ルームコードを入力してください。',
    createMeetingFailed: '会議ルームを作成できませんでした',
    drawerBadge: 'プラットフォーム詳細情報',
    railHome: 'ホーム',
    railFeatures: '機能',
    railPricing: '料金',
    railFaq: 'FAQ',
    railContact: '相談',
    railDevelopers: 'API / Dev',
    backToHome: 'ホームへ戻る',
    calendarNav: '会議カレンダー',
    historyNav: '会議の履歴',
    toolsNav: 'AI・APIキー設定',
    blogNav: 'ガイド & ブログ',
  },
};

export interface HomePageProps {
  forcedLanguage?: AppLanguage;
}

export type ActiveSection = 'home' | 'features' | 'pricing' | 'faq' | 'contact' | 'developers';

// Nav item definition for Google Meet style Menu Drawer
interface NavDrawerItem {
  id: ActiveSection | 'privacy' | 'settings' | 'status' | 'calendar' | 'tools' | 'history';
  icon: React.ElementType;
  labelKey: keyof (typeof HOME_UI)['vi'];
  subtitle?: string;
  badge?: string;
}

const DRAWER_MAIN_ITEMS: NavDrawerItem[] = [
  { id: 'home', icon: Home, labelKey: 'railHome' },
  { id: 'history', icon: Clock, labelKey: 'historyNav' },
  { id: 'calendar', icon: Calendar, labelKey: 'calendarNav' },
  { id: 'features', icon: Sparkles, labelKey: 'railFeatures' },
  { id: 'pricing', icon: CreditCard, labelKey: 'railPricing' },
  { id: 'faq', icon: HelpCircle, labelKey: 'railFaq' },
  { id: 'contact', icon: Phone, labelKey: 'railContact' },
];

export const HomePage: React.FC<HomePageProps> = ({ forcedLanguage }) => {
  const SHOW_ENTERPRISE_SSO = false;
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const ui = HOME_UI[language] || HOME_UI.vi;

  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isEnterpriseSsoOpen, setIsEnterpriseSsoOpen] = useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isToolSettingsOpen, setIsToolSettingsOpen] = useState(false);
  const [isMeetingHistoryOpen, setIsMeetingHistoryOpen] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  // Active section (inline rendering in main stage)
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');

  useEffect(() => {
    if (authLoading || !user?.email) return;

    try {
      if (window.sessionStorage.getItem('layameet:pending-checkout-plan')) {
        setActiveSection('pricing');
      }
    } catch {
      // Checkout can still be opened manually when sessionStorage is unavailable.
    }
  }, [authLoading, user?.email]);

  // Unified Google Meet style Left Menu Drawer (opens on logo / menu click)
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Interactive Meeting Preview visibility (in-memory state, resets on page reload)
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  // Mobile specific account sheets (Google Meet style)
  const [isMobileAccountSheetOpen, setIsMobileAccountSheetOpen] = useState(false);

  // Real-time Clock for Google Meet ergonomic header
  const [currentClockTime, setCurrentClockTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClockTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Body scroll lock when any drawer or modal is open
  useEffect(() => {
    const isAnyOverlayOpen =
      isNavDrawerOpen ||
      isMobileAccountSheetOpen ||
      isStatusModalOpen ||
      isEnterpriseSsoOpen ||
      isScheduleMeetingOpen ||
      isCalendarModalOpen ||
      isToolSettingsOpen ||
      isMeetingHistoryOpen ||
      Boolean(legalModalType);

    if (isAnyOverlayOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [
    isNavDrawerOpen,
    isMobileAccountSheetOpen,
    isStatusModalOpen,
    isEnterpriseSsoOpen,
    isScheduleMeetingOpen,
    isCalendarModalOpen,
    isToolSettingsOpen,
    isMeetingHistoryOpen,
    legalModalType,
  ]);

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNavDrawerOpen) {
          setIsNavDrawerOpen(false);
        } else if (isMobileAccountSheetOpen) {
          setIsMobileAccountSheetOpen(false);
        } else if (legalModalType) {
          setLegalModalType(null);
        } else if (isStatusModalOpen) {
          setIsStatusModalOpen(false);
        } else if (isCalendarModalOpen) {
          setIsCalendarModalOpen(false);
        } else if (isMeetingHistoryOpen) {
          setIsMeetingHistoryOpen(false);
        } else if (isScheduleMeetingOpen) {
          setIsScheduleMeetingOpen(false);
        } else if (activeSection !== 'home') {
          setActiveSection('home');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isNavDrawerOpen,
    isMobileAccountSheetOpen,
    legalModalType,
    isStatusModalOpen,
    isCalendarModalOpen,
    isMeetingHistoryOpen,
    isScheduleMeetingOpen,
    activeSection,
  ]);

  const formatMeetingClock = (date: Date, lang: AppLanguage) => {
    try {
      const locale = lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'vi-VN';
      const timeStr = date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: lang === 'en',
      });
      const dateStr = date.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return `${timeStr} • ${dateStr}`;
    } catch {
      return date.toLocaleTimeString();
    }
  };

  const activeUiLang = UI_LANGUAGE_CARDS.find((item) => item.code === language) || UI_LANGUAGE_CARDS[0];

  // Sync forcedLanguage if navigating via /ja or /en
  useEffect(() => {
    if (forcedLanguage && language !== forcedLanguage) {
      setLanguage(forcedLanguage);
    }
  }, [forcedLanguage, language, setLanguage]);

  // Dynamically update International Meta Tags (SEO & Crawlers)
  useEffect(() => {
    const currentLang = forcedLanguage || language;
    const descMeta = document.querySelector('meta[name="description"]');
    const canonicalLink = document.querySelector('link[rel="canonical"]');

    if (currentLang === 'ja') {
      document.title = 'LayaMeet - AI多言語オンライン会議＆リアルタイム字幕翻訳 | layameet.com';
      document.documentElement.lang = 'ja';
      if (descMeta) {
        descMeta.setAttribute(
          'content',
          '超低遅延AI多言語Web会議プラットフォーム。ベトナム語・日本語・英語のリアルタイム双方向字幕翻訳（遅延350ms未満）、完全RAMメモリ処理（音声ファイル保存なし）、自動議事録・Action Items抽出。'
        );
      }
      if (canonicalLink) {
        canonicalLink.setAttribute('href', 'https://layameet.com/ja');
      }
    } else if (currentLang === 'en') {
      document.title = 'LayaMeet - Real-Time AI Bilingual Meeting & Live Subtitle Translation | layameet.com';
      document.documentElement.lang = 'en';
      if (descMeta) {
        descMeta.setAttribute(
          'content',
          'Ultra-low latency AI multilingual video meeting platform. Real-time bilingual subtitle translation (<350ms), 100% RAM-only audio processing (zero file storage), and instant meeting minutes with Action Items.'
        );
      }
      if (canonicalLink) {
        canonicalLink.setAttribute('href', 'https://layameet.com/en');
      }
    } else {
      document.title = 'LayaMeet - Họp Trực Tuyến Song Ngữ AI & Dịch Trực Tiếp';
      document.documentElement.lang = 'vi';
      if (descMeta) {
        descMeta.setAttribute(
          'content',
          'LayaMeet (layameet.com) - Nền tảng họp trực tuyến song ngữ AI thời gian thực. Nói tiếng mẹ đẻ, dịch tức thì <350ms, bảo mật RAM-only không lưu file âm thanh.'
        );
      }
      if (canonicalLink) {
        canonicalLink.setAttribute('href', 'https://layameet.com/');
      }
    }
  }, [forcedLanguage, language]);

  useEffect(() => {
    const handleOpenPrivacy = () => setLegalModalType('privacy');
    window.addEventListener('layameet:open-privacy-modal', handleOpenPrivacy);
    return () => window.removeEventListener('layameet:open-privacy-modal', handleOpenPrivacy);
  }, []);

  const handleCreateNewMeeting = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await meetingApi.createMeeting('LayaMeet', {
        hostEmail: user?.email || null,
      });
      admissionStorage.saveHostToken(res.meetingCode, res.hostToken);
      navigate(`/meeting/${res.meetingCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ui.createMeetingFailed;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const extractMeetingCode = (rawInput: string): string => {
    const trimmed = rawInput.trim();
    const urlMatch = trimmed.match(/(?:prejoin|join|meeting)\/([A-Za-z0-9_-]+)/i);
    if (urlMatch?.[1]) {
      return urlMatch[1].toUpperCase();
    }
    return trimmed.slice(0, 12).toUpperCase();
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractMeetingCode(meetingCodeInput);
    if (!code) {
      setError(ui.enterRoomPrompt);
      return;
    }
    setError(null);
    navigate(`/meeting/${code}`);
  };

  const handleSelectDrawerItem = (id: ActiveSection | 'privacy' | 'settings' | 'status' | 'calendar' | 'tools' | 'history') => {
    setIsNavDrawerOpen(false);
    if (id === 'developers') {
      navigate('/developers');
    } else if (id === 'status') {
      setIsStatusModalOpen(true);
    } else if (id === 'privacy') {
      setLegalModalType('privacy');
    } else if (id === 'settings') {
      navigate('/settings?tab=subtitles');
    } else if (id === 'calendar') {
      setIsCalendarModalOpen(true);
    } else if (id === 'history') {
      setIsMeetingHistoryOpen(true);
    } else if (id === 'tools') {
      navigate('/settings?tab=ai_byok');
    } else {
      setActiveSection(id);
    }
  };

  return (
    <div className="home-page relative min-h-dvh bg-zinc-50 dark:bg-[#0f0f10] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors overflow-x-hidden">
      {/* ── Interactive Neural Linguistic Synapse Network (Mouse reactive) ── */}
      <NeuralLinguisticBackground />

      {/* ── Background Atmospheric Light Layer (Full Viewport, No Cutoff) ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-0 right-0 w-full h-[850px] ambient-hero-glow" />
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="hidden md:block absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 dark:via-blue-400/50 to-transparent" />
      </div>

      {/* ── MOBILE: Google Meet Floating Top Pill Bar (< md) ────── */}
      <div className="md:hidden sticky top-0 z-40 px-3 pt-3 pb-1.5 bg-zinc-50/85 dark:bg-[#0f0f10]/85 backdrop-blur-md">
        <form
          onSubmit={handleJoinWithCode}
          className="flex items-center gap-1.5 min-h-[48px] h-12 px-2 rounded-full bg-zinc-200/85 dark:bg-[#22242a] border border-zinc-300/70 dark:border-[#32353e] shadow-md"
        >
          {/* Left Logo Button to open Menu Drawer */}
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="mobile-hamburger-btn"
            aria-label={ui.navDrawerTitle}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer touch-manipulation"
          >
            <LayaMeetLogo size="sm" showWordmark={false} />
          </button>

          {/* Center Room Code / Search Input */}
          <input
            type="text"
            placeholder={t.hero.inputRoomCode}
            value={meetingCodeInput}
            onChange={(e) => {
              setMeetingCodeInput(extractMeetingCode(e.target.value));
              if (error) setError(null);
            }}
            aria-label={t.hero.inputRoomCode}
            className="flex-1 min-w-0 h-11 py-2 bg-transparent text-zinc-900 dark:text-zinc-100 text-base font-medium placeholder-zinc-500 dark:placeholder-zinc-400 outline-none uppercase font-mono tracking-wider"
          />

          {/* Join by Code Action Button */}
          {meetingCodeInput.trim() ? (
            <button
              type="submit"
              aria-label={t.hero.btnJoin}
              className="min-h-[44px] px-3.5 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer shrink-0 touch-manipulation"
            >
              <span>{ui.joinShort}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label={t.hero.inputRoomCode}
              title={t.hero.inputRoomCode}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors shrink-0 cursor-pointer touch-manipulation"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {/* Far-Right Profile / Language Flag Avatar */}
          <button
            type="button"
            onClick={() => setIsMobileAccountSheetOpen(true)}
            aria-label={ui.accountSheetTitle}
            title={ui.accountSheetTitle}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white/80 dark:ring-[#18191d] shrink-0 cursor-pointer touch-manipulation"
          >
            <CountryFlag code={activeUiLang.code} size="sm" />
          </button>
        </form>
      </div>

      {/* ── DESKTOP: Fixed Top Navbar (md+) ─────────────────────────── */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-14 border-b border-zinc-200/80 dark:border-[#2e2e30]/80 bg-white/90 dark:bg-[#0f0f10]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 items-center justify-between shrink-0 z-50 transition-colors shadow-xs">
        {/* Brand Logo with Google Meet Menu Trigger + Meeting Clock */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Google Meet style Logo Button that triggers Menu Drawer */}
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="header-logo-menu-btn"
            aria-label={ui.navDrawerTitle}
            title={ui.navDrawerTitle}
            className="p-1.5 -ml-1.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-white/[0.08] active:scale-98 transition-all cursor-pointer"
          >
            <LayaMeetLogo size="md" />
          </button>

          {/* Real-time Meeting Clock */}
          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-zinc-200 dark:border-[#2e2e30] text-xs font-medium text-zinc-500 dark:text-zinc-400 select-none">
            <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" />
            <span className="font-mono">{formatMeetingClock(currentClockTime, language)}</span>
          </div>

          {/* Breadcrumb: current section name when not on home */}
          {activeSection !== 'home' && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pl-3 border-l border-zinc-200 dark:border-[#2e2e30]">
              <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                {ui[
                  DRAWER_MAIN_ITEMS.find((r) => r.id === activeSection)?.labelKey ??
                    'railHome'
                ]}
              </span>
              <button
                type="button"
                onClick={() => setActiveSection('home')}
                data-testid="rail-back-home"
                className="ml-2 flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{ui.backToHome}</span>
              </button>
            </div>
          )}
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Automatic + Manual Location Language Switcher */}
          <LanguageSwitcher />

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Quick Calendar Button */}
          <button
            type="button"
            onClick={() => setIsCalendarModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white hover:bg-zinc-100 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] border border-zinc-200 dark:border-[#3a3a3d] p-2 sm:px-3 sm:py-1.5 rounded-lg transition-colors cursor-pointer"
            title={ui.calendarNav}
            aria-label={ui.calendarNav}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="hidden lg:inline">{ui.calendarNav}</span>
          </button>

          {/* Quick AI Tools & API Key Settings */}
          <button
            type="button"
            onClick={() => setIsToolSettingsOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white hover:bg-zinc-100 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] border border-zinc-200 dark:border-[#3a3a3d] p-2 sm:px-3 sm:py-1.5 rounded-lg transition-colors cursor-pointer"
            title={ui.toolsNav}
            aria-label={ui.toolsNav}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden lg:inline">{language === 'ja' ? 'AI設定' : language === 'en' ? 'AI Settings' : 'Cài đặt AI'}</span>
          </button>

          {/* Privacy & System Status */}
          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white hover:bg-zinc-100 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] border border-zinc-200 dark:border-[#3a3a3d] p-2 sm:px-3 sm:py-1.5 rounded-lg transition-colors cursor-pointer"
            title={ui.systemStatusLabel}
            aria-label={ui.systemStatusLabel}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="hidden sm:inline">{t.nav.systemPrivacy}</span>
          </button>

          {/* Language Matrix Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#1a1a1b] border border-zinc-200 dark:border-[#2e2e30] px-3 py-1.5 rounded-lg">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.nav.polyglotMatrix}</span>
          </div>

          {/* Supabase Google Login / User Profile Pill */}
          <GoogleAuthControl variant="navbar" />
        </div>
      </header>

      {/* Spacer for fixed header on desktop */}
      <div className="hidden md:block h-14 shrink-0" aria-hidden="true" />

      {/* ── Main Content Canvas ──────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col justify-between w-full">
        {/* ── MOBILE: Google Meet Clean Center Canvas + Bottom-Right FAB (< md) ── */}
        {activeSection === 'home' && (<section className="md:hidden flex-1 flex flex-col items-center justify-center px-6 py-8 text-center select-none">
          {error && (
            <div role="alert" className="w-full max-w-xs mb-5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Google Meet Style Circular Vector Illustration */}
          <div className="relative w-44 h-44 mb-6 rounded-full bg-gradient-to-b from-blue-500/15 via-indigo-500/10 to-zinc-200/40 dark:from-blue-500/20 dark:via-indigo-500/15 dark:to-[#1a1c23] border border-blue-500/20 dark:border-white/10 flex flex-col items-center justify-center shadow-inner">
            <div className="flex items-center gap-1 mb-2 px-2.5 py-1 rounded-full bg-white/90 dark:bg-[#22242c] border border-zinc-200/80 dark:border-white/10 shadow-sm">
              <CountryFlag code="vi" size="xs" />
              <CountryFlag code="ja" size="xs" />
              <CountryFlag code="en" size="xs" />
              <CountryFlag code="zh" size="xs" />
              <CountryFlag code="ko" size="xs" />
              <CountryFlag code="th" size="xs" />
              <CountryFlag code="id" size="xs" />
              <CountryFlag code="ar" size="xs" />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 font-mono ml-0.5">+4</span>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-blue-600/15 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Video className="w-7 h-7" />
            </div>

            <span className="mt-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              AI &lt;350ms • RAM-Only
            </span>
          </div>

          {/* Concise 2-line Center Caption */}
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 max-w-[280px] leading-snug">
            {t.hero.titleLine1} {t.hero.titleHighlight.replace(/[,、]\s*$/, '')}
          </h1>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-[270px] leading-relaxed">
            {ui.mobileHelpText}
          </p>

          {/* Quick pill triggers */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMobileAccountSheetOpen(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-full bg-zinc-200/70 dark:bg-[#1e2028] border border-zinc-300/70 dark:border-[#2e313d] text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer active:scale-98 transition-all touch-manipulation"
            >
              <CountryFlag code={activeUiLang.code} size="xs" />
              <span>{activeUiLang.native}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-full bg-zinc-200/70 dark:bg-[#1e2028] border border-zinc-300/70 dark:border-[#2e313d] text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer active:scale-98 transition-all touch-manipulation"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>{ui.ramOnlyBadge}</span>
            </button>
            <Link
              to={language === 'en' ? '/en/guide' : language === 'ja' ? '/ja/guide' : '/cam-nang'}
              className="min-h-[44px] px-4 py-2.5 rounded-full bg-zinc-200/70 dark:bg-[#1e2028] border border-zinc-300/70 dark:border-[#2e313d] text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer active:scale-98 transition-all touch-manipulation"
            >
              <BookOpen className="w-4 h-4" />
              <span>{ui.blogNav}</span>
            </Link>
          </div>

          {/* Google Meet Signature Bottom-Right FAB */}
          <button
            type="button"
            onClick={handleCreateNewMeeting}
            disabled={loading}
            className="home-mobile-create h-12 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-semibold shadow-[0_12px_30px_-6px_rgba(37,99,235,0.65)] flex items-center gap-2.5 text-sm cursor-pointer transition-all"
          >
            <Video className="w-5 h-5 shrink-0" />
            <span>{loading ? t.hero.btnCreating : t.hero.btnCreate}</span>
          </button>
        </section>)}

        {/* ── DESKTOP/TABLET: Focused Google Meet Canvas (md+) ── */}
        <div className="flex flex-1 flex-col">
          {/* ── HOME section (default) ── */}
          {activeSection === 'home' && (
            <section
              id="hero"
              className="hidden md:flex flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16 flex-col lg:flex-row items-center justify-between py-8 lg:py-12 gap-8 lg:gap-14 xl:gap-20"
            >
              {/* Left: Headline + Primary Actions */}
              <div className="w-full max-w-md sm:max-w-xl lg:max-w-xl xl:max-w-2xl space-y-6 text-center lg:text-left">
                {/* Enterprise Security Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{t.hero.infraBadge}</span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">{t.hero.infraSub}</span>
                </div>

                <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-[1.12]">
                  {t.hero.titleLine1}
                  <br />
                  <span className="text-blue-600 dark:text-blue-400 font-black">
                    {t.hero.titleHighlight}
                  </span>
                  <span>{t.hero.titleEnd}</span>
                </h1>

                <p className="text-zinc-600 dark:text-zinc-400 text-base lg:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {t.hero.description}
                </p>

                {/* 12 Multilingual National Flags Showcase Strip */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {language === 'ja'
                      ? '12言語リアルタイム対応:'
                      : language === 'en'
                      ? '12 Real-Time Languages:'
                      : 'Hỗ trợ 12 ngôn ngữ song ngữ:'}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#1a1c23] border border-zinc-200/90 dark:border-white/10 shadow-2xs">
                    <CountryFlag code="vi" size="xs" />
                    <CountryFlag code="ja" size="xs" />
                    <CountryFlag code="en" size="xs" />
                    <CountryFlag code="zh" size="xs" />
                    <CountryFlag code="ko" size="xs" />
                    <CountryFlag code="th" size="xs" />
                    <CountryFlag code="id" size="xs" />
                    <CountryFlag code="tl" size="xs" />
                    <CountryFlag code="ar" size="xs" />
                    <CountryFlag code="fr" size="xs" />
                    <CountryFlag code="de" size="xs" />
                    <CountryFlag code="es" size="xs" />
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 ml-1">
                      12 Langs
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs">
                    {error}
                  </div>
                )}

                {/* CTA row — Google Meet style primary actions */}
                <div className="flex flex-row flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCreateNewMeeting}
                    disabled={loading}
                    className="whitespace-nowrap px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-base cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35"
                  >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span>{loading ? t.hero.btnCreating : t.hero.btnCreate}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScheduleMeetingOpen(true)}
                    className="whitespace-nowrap px-5 py-3 bg-white hover:bg-zinc-50 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] text-zinc-800 dark:text-zinc-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base cursor-pointer border border-zinc-300 dark:border-[#3a3a3d] shadow-xs"
                  >
                    <Calendar className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>
                      {language === 'ja' ? '予定を設定' : language === 'en' ? 'Schedule' : 'Đặt lịch họp'}
                    </span>
                  </button>

                  {SHOW_ENTERPRISE_SSO && (
                    <button
                      type="button"
                      onClick={() => setIsEnterpriseSsoOpen(true)}
                      className="whitespace-nowrap px-5 py-3 bg-white hover:bg-zinc-50 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] text-zinc-800 dark:text-zinc-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base cursor-pointer border border-zinc-300 dark:border-[#3a3a3d] shadow-xs"
                    >
                      <Building2 className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>{t.hero.btnEnterpriseSso}</span>
                    </button>
                  )}

                  {/* Unified Room Code Input Pill */}
                  <form onSubmit={handleJoinWithCode} className="relative flex items-center">
                    <div className="relative flex items-center rounded-xl bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-[#323238] shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                      <Keyboard className="w-5 h-5 text-zinc-400 dark:text-zinc-400 ml-3.5 shrink-0" />
                      <input
                        type="text"
                        placeholder={t.hero.inputRoomCode}
                        value={meetingCodeInput}
                        onChange={(e) => {
                          setMeetingCodeInput(extractMeetingCode(e.target.value));
                          if (error) setError(null);
                        }}
                        aria-label={t.hero.inputRoomCode}
                        className="w-44 sm:w-52 bg-transparent text-zinc-900 dark:text-zinc-100 text-base font-medium px-3 py-3 outline-none uppercase font-mono tracking-wider placeholder-zinc-400 dark:placeholder-zinc-500"
                      />
                      <button
                        type="submit"
                        disabled={!meetingCodeInput.trim()}
                        className={`mr-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:cursor-default ${
                          meetingCodeInput.trim()
                            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-xs'
                            : 'text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                        aria-label={t.hero.btnJoin}
                      >
                        <span>{t.hero.btnJoin}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>

                <UpcomingMeetingsStrip
                  refreshKey={scheduleRefreshKey}
                  onOpenCalendar={() => setIsCalendarModalOpen(true)}
                />

                {/* Brand Proof Metrics (Desktop/Tablet) */}
                <div className="grid pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 grid-cols-3 gap-4 text-center lg:text-left">
                  <div>
                    <div className="text-xl font-bold text-zinc-950 dark:text-zinc-100 font-mono">{t.hero.metricZeroStorage}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.hero.metricZeroSub}</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{t.hero.metricLatency}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.hero.metricLatencySub}</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{t.hero.metricOnPrem}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.hero.metricOnPremSub}</div>
                  </div>
                </div>
              </div>

              {/* Right: Live Interactive Demo Studio Preview */}
              <div className="flex relative group shrink-0 w-full lg:w-auto justify-center">
                {isPreviewVisible ? (
                  <>
                    <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600/10 via-indigo-600/5 to-transparent rounded-3xl blur-xl pointer-events-none" />
                    <InteractiveMeetingPreview onClose={() => setIsPreviewVisible(false)} />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm text-center max-w-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                      {t.hero.showPreview}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
                      {t.hero.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsPreviewVisible(true)}
                      data-testid="preview-reopen-btn"
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer transition-all active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t.hero.showPreview}</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── FEATURES section (inline) ── */}
          {activeSection === 'features' && (
            <section className="flex-1 overflow-y-auto animate-in fade-in duration-200">
              <div className="w-full max-w-4xl mx-auto px-6 md:px-8 py-10 space-y-8">
                {/* Header */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{t.nav.polyglotMatrix}</span>
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
                    {t.features.sectionTitle}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                    {t.features.sectionSubtitle}
                  </p>
                </div>

                {/* 4 Feature Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {t.features.items.map((item, idx) => {
                    const icons = [Mic, Globe, FileText, ShieldCheck];
                    const Icon = icons[idx] || Sparkles;
                    return (
                      <div
                        key={item.title}
                        className="bg-white dark:bg-[#17181f] border border-zinc-200 dark:border-[#2a2c36] rounded-xl p-5 space-y-2.5 shadow-xs"
                      >
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{item.title}</h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Architecture Highlights Pill Box */}
                <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#14151a] border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Enterprise Multi-Tier Architecture</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                    <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1a1c24] border border-zinc-200/80 dark:border-[#2e313e]">
                      <div className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>WebRTC SFU</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">LiveKit Engine with dynamic renegotiation locks</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1a1c24] border border-zinc-200/80 dark:border-[#2e313e]">
                      <div className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-blue-500" />
                        <span>Whisper int8</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">350ms chunking with VAD energy threshold</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/80 dark:bg-[#1a1c24] border border-zinc-200/80 dark:border-[#2e313e]">
                      <div className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>RAM-Only</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Zero raw audio files written to persistent storage</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── PRICING section (inline) ── */}
          {activeSection === 'pricing' && (
            <section className="flex-1 overflow-y-auto animate-in fade-in duration-200">
              <div className="w-full max-w-5xl mx-auto px-4 py-8">
                <PricingSection />
              </div>
            </section>
          )}

          {/* ── FAQ section (inline) ── */}
          {activeSection === 'faq' && (
            <section className="flex-1 overflow-y-auto animate-in fade-in duration-200">
              <div className="w-full max-w-3xl mx-auto px-6 py-8">
                <FAQSection />
              </div>
            </section>
          )}

          {/* ── CONTACT section (inline) ── */}
          {activeSection === 'contact' && (
            <section className="flex-1 overflow-y-auto animate-in fade-in duration-200">
              <div className="w-full max-w-4xl mx-auto px-6 py-8">
                <ContactSection />
              </div>
            </section>
          )}
        </div>

        {/* ── MINIMAL BOTTOM DOCK (Desktop / Laptop / Tablet) ── */}
        <footer className="flex flex-wrap gap-4 border-t border-zinc-200/80 dark:border-[#222327] bg-white/75 dark:bg-[#0c0c0e]/75 backdrop-blur-md px-6 lg:px-12 py-3 items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span>{t.footer.copyright}</span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{ui.minimalFooterBadge}</span>
            </div>
          </div>

          {/* Legal links */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLegalModalType('privacy')}
              className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {ui.privacyLink}
            </button>
            <button
              type="button"
              onClick={() => setLegalModalType('terms')}
              className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {ui.termsLink}
            </button>
            <Link
              to={language === 'en' ? '/en/guide' : language === 'ja' ? '/ja/guide' : '/cam-nang'}
              className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              {ui.blogNav}
            </Link>
            <Link to="/developers" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              {t.nav.developers}
            </Link>
          </div>
        </footer>
      </main>

      {/* ── UNIFIED GOOGLE MEET STYLE LEFT NAVIGATION DRAWER ── */}
      {isNavDrawerOpen && (
        <AdaptiveDialog label={ui.navDrawerTitle} onClose={() => setIsNavDrawerOpen(false)} className="home-nav-dialog">
          {/* Slide-in Drawer Container */}
          <aside
            className="relative z-10 w-full min-h-0 bg-white dark:bg-[#141519] border-r border-zinc-200 dark:border-[#272832] p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto"
          >
            <div className="space-y-5">
              {/* Brand Header with Close (X) button */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200/80 dark:border-[#272832]">
                <LayaMeetLogo size="md" />
                <button
                  type="button"
                  onClick={() => setIsNavDrawerOpen(false)}
                  data-testid="nav-drawer-close-btn"
                  aria-label={ui.closeDrawer}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Group 1: Main Navigation */}
              <nav className="space-y-1">
                {DRAWER_MAIN_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  const label = ui[item.labelKey];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectDrawerItem(item.id)}
                      data-testid={`drawer-${item.id}`}
                      className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                        isActive
                          ? 'bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}`} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Group 2: Developers & Integration */}
              <div className="pt-2 border-t border-zinc-200/80 dark:border-[#272832]">
                <nav className="space-y-1">
                  <Link
                    to={language === 'en' ? '/en/guide' : language === 'ja' ? '/ja/guide' : '/cam-nang'}
                    onClick={() => setIsNavDrawerOpen(false)}
                    data-testid="drawer-guides"
                    className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <BookOpen className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span>{ui.blogNav}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleSelectDrawerItem('developers')}
                    data-testid="drawer-developers"
                    className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <Code2 className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span>{t.nav.developers}</span>
                  </button>
                </nav>
              </div>

              {/* Group 3: System & Preferences */}
              <div className="pt-2 border-t border-zinc-200/80 dark:border-[#272832]">
                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleSelectDrawerItem('status')}
                    data-testid="drawer-status"
                    className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <ShieldCheck className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span>{ui.systemStatusLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDrawerItem('tools')}
                    data-testid="drawer-tools"
                    className="w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <Sliders className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                    <span>{ui.toolsNav}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDrawerItem('settings')}
                    data-testid="drawer-settings"
                    className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      <span>{ui.settingsNav}</span>
                    </div>
                    <CountryFlag code={activeUiLang.code} size="xs" />
                  </button>
                </nav>
              </div>
            </div>

            {/* Bottom Legal Info */}
            <div className="pt-4 border-t border-zinc-200/80 dark:border-[#272832]">
              <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectDrawerItem('privacy')}
                    className="hover:underline cursor-pointer"
                  >
                    {ui.privacyLink}
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavDrawerOpen(false);
                      setLegalModalType('terms');
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    {ui.termsLink}
                  </button>
                </div>
                <span>© 2026</span>
              </div>
            </div>
          </aside>
        </AdaptiveDialog>
      )}

      {/* ── QUICK SETTINGS & LANGUAGE SHEET ── */}
      {isMobileAccountSheetOpen && (
        <AdaptiveDialog label={ui.accountSheetTitle} onClose={() => setIsMobileAccountSheetOpen(false)}>
          <div
            className="w-full max-w-md bg-zinc-100 dark:bg-[#1e1f26] border border-zinc-200 dark:border-[#2e313d] rounded-3xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            {/* Top Header Row */}
            <div className="relative flex items-center justify-center py-1">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                LayaMeet
              </span>
              <button
                type="button"
                onClick={() => setIsMobileAccountSheetOpen(false)}
                aria-label={ui.closeDrawer}
                className="absolute right-1 p-2 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stacked Cards */}
            <div className="space-y-2">
              {/* Card 0: Google Account via Supabase Auth */}
              <GoogleAuthControl variant="card" />

              {/* Card 1: Spoken / Display Language Selection with National Flags */}
              <div className="bg-white dark:bg-[#14151a] rounded-3xl p-4 border border-zinc-200/70 dark:border-white/[0.06] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shrink-0">
                    <CountryFlag code={activeUiLang.code} size="lg" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {ui.langDisplayHeader}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <CountryFlag code="vi" size="xs" />
                      <span>VI ↔</span>
                      <CountryFlag code="ja" size="xs" />
                      <span>JA /</span>
                      <CountryFlag code="en" size="xs" />
                      <span>EN · 12 ngôn ngữ</span>
                    </div>
                  </div>
                </div>

                {/* Language Flag Selector Pills */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {UI_LANGUAGE_CARDS.map((item) => {
                    const isSelected = language === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setLanguage(item.code)}
                        className={`px-2.5 py-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/10 dark:bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-300'
                            : 'bg-zinc-50 dark:bg-[#1c1e26] border-zinc-200 dark:border-[#2c2f3a] text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <CountryFlag code={item.code} size="md" />
                        <span className="flex items-center gap-1">
                          <span>{item.native}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Upgrade / Pro AI Plan Card */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileAccountSheetOpen(false);
                  setActiveSection('pricing');
                }}
                className="w-full bg-white dark:bg-[#14151a] hover:bg-zinc-50 dark:hover:bg-[#191b22] rounded-2xl p-3.5 border border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-between gap-3 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {ui.proUpgradeTitle}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {ui.proUpgradeSub}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
              </button>

              {/* Card 3: Theme Toggle & System Status */}
              <div className="bg-white dark:bg-[#14151a] rounded-2xl p-3.5 border border-zinc-200/70 dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SunMoon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {ui.themeToggleLabel}
                    </span>
                  </div>
                  <ThemeToggle />
                </div>

                <div className="h-px bg-zinc-200/70 dark:bg-white/[0.06]" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileAccountSheetOpen(false);
                    setIsCalendarModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200 pt-0.5 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>{ui.calendarNav}</span>
                  </span>
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">Xem lịch</span>
                </button>

                <div className="h-px bg-zinc-200/70 dark:bg-white/[0.06]" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileAccountSheetOpen(false);
                    navigate('/settings?tab=ai_byok');
                  }}
                  className="w-full flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200 pt-0.5 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <span>{ui.toolsNav}</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">BYOK</span>
                </button>

                <div className="h-px bg-zinc-200/70 dark:bg-white/[0.06]" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileAccountSheetOpen(false);
                    setIsStatusModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200 pt-0.5 cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>{ui.systemStatusLabel}</span>
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">RAM-Only</span>
                </button>
              </div>
            </div>

            {/* Bottom Legal Links */}
            <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              <button
                type="button"
                onClick={() => {
                  setIsMobileAccountSheetOpen(false);
                  setLegalModalType('privacy');
                }}
                className="hover:underline cursor-pointer"
              >
                {ui.privacyLink}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setIsMobileAccountSheetOpen(false);
                  setLegalModalType('terms');
                }}
                className="hover:underline cursor-pointer"
              >
                {ui.termsLink}
              </button>
            </div>
          </div>
        </AdaptiveDialog>
      )}

      {/* Calendar Schedule Modal */}
      <CalendarScheduleModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onOpenScheduleNew={() => {
          setIsCalendarModalOpen(false);
          setIsScheduleMeetingOpen(true);
        }}
        refreshKey={scheduleRefreshKey}
      />

      {/* AI Tools & API Key Settings Modal */}
      <SystemToolSettingsModal
        isOpen={isToolSettingsOpen}
        onClose={() => setIsToolSettingsOpen(false)}
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleMeetingOpen}
        language={language}
        onClose={() => setIsScheduleMeetingOpen(false)}
        onCreated={() => setScheduleRefreshKey((value) => value + 1)}
      />

      <SystemStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />

      {SHOW_ENTERPRISE_SSO && (
        <EnterpriseSsoModal
          isOpen={isEnterpriseSsoOpen}
          onClose={() => setIsEnterpriseSsoOpen(false)}
        />
      )}

      {/* Legal & Terms Modal */}
      <LegalModal
        isOpen={legalModalType !== null}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      <MeetingHistoryModal
        isOpen={isMeetingHistoryOpen}
        onClose={() => setIsMeetingHistoryOpen(false)}
        email={user?.email || undefined}
      />
    </div>
  );
};
