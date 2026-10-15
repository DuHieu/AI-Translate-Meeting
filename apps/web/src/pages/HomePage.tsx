import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { meetingApi } from '../api/meetingApi';
import {
  Plus,
  ArrowRight,
  Globe,
  X,
  Settings,
  HelpCircle,
  Sparkles,
  Video,
  Keyboard,
  Clock,
  Zap,
  Home,
  CreditCard,
  Phone,
  Calendar,
  Menu,
  LogOut,
  ChevronDown,
  Link2,
  ShieldCheck,
  Monitor,
  Download,
} from 'lucide-react';
import { admissionStorage } from '../utils/admissionStorage';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { InteractiveMeetingPreview } from '../components/home/InteractiveMeetingPreview';
import { LegalModal } from '../components/common/LegalModal';
import { Footer } from '../components/common/Footer';
import { useLanguage } from '../context/language-context-def';
import { useAuth } from '../context/auth-context-def';
import { AppLanguage } from '../i18n';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { NeuralLinguisticBackground } from '../components/common/NeuralLinguisticBackground';
import { GoogleAuthControl } from '../components/auth/GoogleAuthControl';
import { ScheduleMeetingModal } from '../components/home/ScheduleMeetingModal';
import { CreateMeetingForLaterModal } from '../components/home/CreateMeetingForLaterModal';
import { UpcomingMeetingsStrip } from '../components/home/UpcomingMeetingsStrip';
import { DownloadModal } from '../components/home/DownloadModal';
import { DesktopLandingSections } from '../components/home/DesktopLandingSections';
import { scrollLock } from '../utils/scrollLock';

const HOME_UI: Record<string, Record<string, string>> = {
  vi: {
    joinShort: 'Vào',
    newMeetingFab: 'Mới',
    mobileHelpText: 'Nhấn nút Mới ở góc dưới để tạo phòng họp hoặc nhập mã phòng trên thanh tìm kiếm.',
    ramOnlyBadge: 'Bảo mật RAM-Only',
    ramOnlyFull: '100% RAM-Only • Không lưu file âm thanh',
    navDrawerTitle: 'Menu điều hướng LayaMeet',
    groupMain: 'CHÍNH',
    groupMeetings: 'CUỘC HỌP',
    groupAccount: 'TÀI KHOẢN',
    groupHelp: 'TRỢ GIÚP & TÀI NGUYÊN',
    groupSystem: 'HỆ THỐNG',
    newMeetingDrawer: 'Bắt đầu cuộc họp mới',
    joinMeetingDrawer: 'Tham gia bằng mã',
    planNav: 'Gói dịch vụ & Hạn mức',
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
    menuCreateForLater: 'Tạo một cuộc họp để sử dụng sau',
    menuCreateForLaterDesc: 'Nhận đường liên kết để chia sẻ cho người khác',
    menuStartInstant: 'Bắt đầu một cuộc họp tức thì',
    menuStartInstantDesc: 'Vào ngay phòng họp với camera và micro',
    menuSchedule: 'Lên lịch trong Lịch',
    menuScheduleDesc: 'Lên kế hoạch và gửi thư mời trước',
    desktopBadge: 'LayaMeet Desktop Companion • v1.0.0',
    heroDesktopTitle1: 'Phụ Đề & Dịch AI Trực Tiếp',
    heroDesktopTitleHighlight: 'Cho Zoom & Google Meet',
    heroDesktopTitleEnd: 'Ngay Trên Máy Tính',
    heroDesktopDesc: 'Không cần mời bot, không tốn băng thông máy chủ. Ứng dụng Desktop tự động bắt âm thanh hệ thống 2 chiều (WASAPI), hiển thị phụ đề nổi trong suốt <350ms và xuất biên bản họp tự động.',
    btnDownloadWindows: 'Tải Cho Windows (Miễn Phí)',
    btnDownloadWindowsShort: 'Tải Desktop App',
    downloadSubtext: 'Windows 10/11 64-bit • Bộ cài 15MB • v1.0.0',
    orWebMeeting: 'Hoặc trải nghiệm nhanh phòng họp Web Demo:',
  },
  en: {
    joinShort: 'Join',
    newMeetingFab: 'New',
    mobileHelpText: 'Tap New below to create an instant meeting or enter a room code above.',
    ramOnlyBadge: 'RAM-Only Security',
    ramOnlyFull: '100% RAM-Only • Zero Raw Audio Storage',
    navDrawerTitle: 'LayaMeet Navigation Menu',
    groupMain: 'MAIN',
    groupMeetings: 'MEETINGS',
    groupAccount: 'ACCOUNT',
    groupHelp: 'HELP & RESOURCES',
    groupSystem: 'SYSTEM',
    newMeetingDrawer: 'Start New Meeting',
    joinMeetingDrawer: 'Join with Code',
    planNav: 'Plan & Usage',
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
    menuCreateForLater: 'Create a meeting for later',
    menuCreateForLaterDesc: 'Get a link that you can share with people',
    menuStartInstant: 'Start an instant meeting',
    menuStartInstantDesc: 'Join immediately with your camera and mic',
    menuSchedule: 'Schedule in Calendar',
    menuScheduleDesc: 'Plan ahead and send calendar invites',
    desktopBadge: 'LayaMeet Desktop Companion • v1.0.0',
    heroDesktopTitle1: 'Live AI Subtitles & Translation',
    heroDesktopTitleHighlight: 'For Zoom & Google Meet',
    heroDesktopTitleEnd: 'Directly On Your PC',
    heroDesktopDesc: 'No bot required, zero server bandwidth costs. The Desktop App captures system audio (WASAPI loopback), renders floating bilingual subtitles (<350ms), and auto-generates meeting minutes.',
    btnDownloadWindows: 'Download for Windows (Free)',
    btnDownloadWindowsShort: 'Download App',
    downloadSubtext: 'Windows 10/11 64-bit • Installer 15MB • v1.0.0',
    orWebMeeting: 'Or test the instant Web Meeting room:',
  },
  ja: {
    joinShort: '参加',
    newMeetingFab: '新規',
    mobileHelpText: '下の「新規」ボタンで会議を作成するか、上の検索バーにルームコードを入力してください。',
    ramOnlyBadge: '完全RAM処理',
    ramOnlyFull: '完全RAM-only • 音声ファイル保存ゼロ',
    navDrawerTitle: 'LayaMeet ナビゲーションメニュー',
    groupMain: 'メイン',
    groupMeetings: 'ミーティング',
    groupAccount: 'アカウント',
    groupHelp: 'ヘルプ & リソース',
    groupSystem: 'システム',
    newMeetingDrawer: '新しい会議を開始',
    joinMeetingDrawer: 'コードで参加',
    planNav: 'プラン & 利用状況',
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
    menuCreateForLater: '後で利用する会議を作成',
    menuCreateForLaterDesc: '他の参加者と共有できるリンクを取得します',
    menuStartInstant: '今すぐ会議を開始',
    menuStartInstantDesc: 'カメラとマイクを準備して即時参加します',
    menuSchedule: 'カレンダーでスケジュール設定',
    menuScheduleDesc: '事前計画を立てて招待状を送信します',
    desktopBadge: 'LayaMeet デスクトップ版 • v1.0.0',
    heroDesktopTitle1: 'リアルタイムAI多言語字幕翻訳',
    heroDesktopTitleHighlight: 'Zoom・Google Meet対応',
    heroDesktopTitleEnd: 'PC上で直接動作',
    heroDesktopDesc: 'ボットの招待不要・サーバー帯域コストゼロ。デスクトップアプリがPC内部音声（WASAPIループバック）を直接検出し、最前面の透明字幕バーで双方向即時翻訳を提供します。',
    btnDownloadWindows: 'Windows版をダウンロード (無料)',
    btnDownloadWindowsShort: 'アプリをダウンロード',
    downloadSubtext: 'Windows 10/11 64-bit • 容量15MB • v1.0.0',
    orWebMeeting: 'またはWeb版ミーティングをテスト:',
  },
};

export interface HomePageProps {
  forcedLanguage?: AppLanguage;
}

export type ActiveSection = 'home' | 'features' | 'pricing' | 'faq' | 'contact' | 'developers';

export const HomePage: React.FC<HomePageProps> = ({ forcedLanguage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { user, loading: authLoading, signOut } = useAuth();
  const ui = HOME_UI[language] || HOME_UI.vi;

  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Active section (inline rendering in main stage)
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');

  useEffect(() => {
    const hashSection = location.hash.replace(/^#/, '');
    if (hashSection === 'pricing') {
      navigate('/pricing', { replace: true });
    } else if (hashSection === 'features') {
      navigate('/features', { replace: true });
    } else if (hashSection === 'faq') {
      navigate('/faq', { replace: true });
    } else if (hashSection === 'contact') {
      navigate('/contact', { replace: true });
    } else if (hashSection === 'developers') {
      navigate('/developers', { replace: true });
    }
  }, [location.hash, navigate]);

  useEffect(() => {
    if (authLoading || !user?.email) return;

    try {
      if (window.sessionStorage.getItem('layameet:pending-checkout-plan')) {
        navigate('/pricing');
      }
    } catch {
      // Checkout can still be opened manually when sessionStorage is unavailable.
    }
  }, [authLoading, user?.email, navigate]);

  // Unified Google Meet style Left Menu Drawer (opens on logo / menu click)
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Google Meet style New Meeting menu & Create For Later modal
  const [isNewMeetingMenuOpen, setIsNewMeetingMenuOpen] = useState(false);
  const [isCreateForLaterModalOpen, setIsCreateForLaterModalOpen] = useState(false);
  const [createdMeetingForLaterCode, setCreatedMeetingForLaterCode] = useState<string | null>(null);
  const newMeetingMenuDesktopRef = useRef<HTMLDivElement>(null);
  const newMeetingMenuMobileRef = useRef<HTMLDivElement>(null);

  // Close New Meeting menu on click outside
  useEffect(() => {
    if (!isNewMeetingMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktop = newMeetingMenuDesktopRef.current?.contains(target);
      const clickedMobile = newMeetingMenuMobileRef.current?.contains(target);
      if (!clickedDesktop && !clickedMobile) {
        setIsNewMeetingMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNewMeetingMenuOpen]);

  // Interactive Meeting Preview visibility (in-memory state, resets on page reload)
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  // Body scroll lock when any drawer or modal is open
  useEffect(() => {
    const isAnyOverlayOpen =
      isNavDrawerOpen ||
      isScheduleMeetingOpen ||
      isCreateForLaterModalOpen ||
      isDownloadModalOpen ||
      Boolean(legalModalType);

    if (isAnyOverlayOpen) {
      const releaseScrollLock = scrollLock.lock();
      return () => {
        releaseScrollLock();
      };
    }
  }, [
    isNavDrawerOpen,
    isScheduleMeetingOpen,
    isCreateForLaterModalOpen,
    isDownloadModalOpen,
    legalModalType,
  ]);

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDownloadModalOpen) {
          setIsDownloadModalOpen(false);
        } else if (isNewMeetingMenuOpen) {
          setIsNewMeetingMenuOpen(false);
        } else if (isCreateForLaterModalOpen) {
          setIsCreateForLaterModalOpen(false);
        } else if (isNavDrawerOpen) {
          setIsNavDrawerOpen(false);
        } else if (legalModalType) {
          setLegalModalType(null);
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
    isDownloadModalOpen,
    isNewMeetingMenuOpen,
    isCreateForLaterModalOpen,
    isNavDrawerOpen,
    legalModalType,
    isScheduleMeetingOpen,
    activeSection,
  ]);

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

  const handleCreateForLater = async () => {
    setIsNewMeetingMenuOpen(false);
    setLoading(true);
    setError(null);
    try {
      const res = await meetingApi.createMeeting('LayaMeet', {
        hostEmail: user?.email || null,
      });
      admissionStorage.saveHostToken(res.meetingCode, res.hostToken);
      setCreatedMeetingForLaterCode(res.meetingCode);
      setIsCreateForLaterModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ui.createMeetingFailed;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInstantMeeting = async () => {
    setIsNewMeetingMenuOpen(false);
    await handleCreateNewMeeting();
  };

  const handleOpenSchedule = () => {
    setIsNewMeetingMenuOpen(false);
    setIsScheduleMeetingOpen(true);
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

  const handleSelectDrawerItem = (
    id:
      | ActiveSection
      | 'privacy'
      | 'settings'
      | 'status'
      | 'calendar'
      | 'tools'
      | 'history'
      | 'plan'
      | 'new-meeting'
      | 'join-meeting'
  ) => {
    setIsNavDrawerOpen(false);
    if (id === 'developers') {
      navigate('/developers');
    } else if (id === 'pricing') {
      navigate('/pricing');
    } else if (id === 'features') {
      navigate('/features');
    } else if (id === 'faq') {
      navigate('/faq');
    } else if (id === 'contact') {
      navigate('/contact');
    } else if (id === 'status') {
      navigate('/system-status');
    } else if (id === 'privacy') {
      setLegalModalType('privacy');
    } else if (id === 'settings') {
      navigate('/settings?tab=subtitles');
    } else if (id === 'plan') {
      navigate('/pricing');
    } else if (id === 'calendar') {
      navigate('/calendar');
    } else if (id === 'history') {
      navigate('/history');
    } else if (id === 'tools') {
      navigate('/settings?tab=ai_byok');
    } else if (id === 'new-meeting') {
      handleCreateNewMeeting();
    } else if (id === 'join-meeting') {
      setActiveSection('home');
      setTimeout(() => {
        const input = document.querySelector('input[aria-label="' + t.hero.inputRoomCode + '"]') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
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

      {/* ── MOBILE: Clean Header (< md) ────── */}
      <header className="md:hidden sticky top-0 z-40 h-14 px-4 bg-white/95 dark:bg-[#0f0f10]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-[#272832]/80 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="mobile-hamburger-btn"
            aria-label={ui.navDrawerTitle}
            className="w-10 h-10 -ml-1.5 rounded-xl flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <LayaMeetLogo size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <GoogleAuthControl variant="navbar" />
        </div>
      </header>

      {/* ── DESKTOP: Fixed Top Navbar (md+) ─────────────────────────── */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-14 border-b border-zinc-200/80 dark:border-[#2e2e30]/80 bg-white/90 dark:bg-[#0f0f10]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 items-center justify-between shrink-0 z-50 transition-colors shadow-xs">
        {/* Brand Logo with Menu Trigger + Meeting Clock */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburger Menu button */}
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="header-logo-menu-btn"
            aria-label={ui.navDrawerTitle}
            title={ui.navDrawerTitle}
            className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo */}
          <Link
            to="/"
            onClick={() => setActiveSection('home')}
            className="flex items-center hover:opacity-90 transition-opacity"
          >
            <LayaMeetLogo size="md" />
          </Link>
        </div>

        {/* Desktop Quick Nav Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick utility shortcuts for desktop */}
          <div className="hidden lg:flex items-center gap-1 pr-1 border-r border-zinc-200/80 dark:border-[#2e2e30]/80">
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              title={ui.calendarNav}
              aria-label={ui.calendarNav}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/history')}
              title={ui.historyNav}
              aria-label={ui.historyNav}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              title={ui.settingsNav}
              aria-label={ui.settingsNav}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Automatic + Manual Location Language Switcher */}
          <LanguageSwitcher />

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Download Desktop App Primary CTA Button */}
          <button
            type="button"
            onClick={() => setIsDownloadModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{ui.btnDownloadWindowsShort}</span>
          </button>

          {/* Supabase Google Login / User Profile Pill with Plan Badge */}
          <GoogleAuthControl variant="navbar" />
        </div>
      </header>

      {/* Spacer for fixed header on desktop */}
      <div className="hidden md:block h-14 shrink-0" aria-hidden="true" />

      {/* ── Main Content Canvas ──────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col justify-between w-full">
        {/* ── MOBILE: Primary Meeting Workspace (< md) ── */}
        {activeSection === 'home' && (
          <section className="md:hidden flex-1 flex flex-col justify-start px-4 sm:px-6 py-6 sm:py-8 max-w-md mx-auto w-full space-y-5 sm:space-y-6">
            {error && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Mobile Hero Headline */}
            <div className="text-center pt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold mb-2.5">
                <Sparkles className="w-3 h-3" />
                <span>{ui.minimalFooterBadge}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
                {t.hero.titleLine1}{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  {t.hero.titleHighlight.replace(/[,、]\s*$/, '')}
                </span>
              </h1>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                {language === 'ja'
                  ? '多言語リアルタイム字幕翻訳・完全RAMメモリ処理'
                  : language === 'en'
                  ? 'Ultra-low latency bilingual subtitle translation with RAM-only privacy.'
                  : 'Phụ đề song ngữ tức thì với AI độ trễ cực thấp · Bảo mật RAM-Only.'}
              </p>
            </div>

            {/* Desktop App Download Companion Card on Mobile */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <span>LayaMeet Desktop</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">15MB</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {language === 'ja'
                      ? 'Zoom / Google Meet 対応'
                      : language === 'en'
                      ? 'Live Subtitles for Zoom & Meet'
                      : 'Phụ đề trực tiếp cho Zoom & Meet'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'ja' ? 'ダウンロード' : language === 'en' ? 'Download' : 'Tải App'}</span>
              </button>
            </div>

            {/* Primary Actions: Start Meeting + Join by Code */}
            <div className="space-y-3">
              {/* 1. Large Primary Button with Dropdown Menu (Google Meet style) */}
              <div className="relative w-full" ref={newMeetingMenuMobileRef}>
                <button
                  type="button"
                  onClick={() => setIsNewMeetingMenuOpen((prev) => !prev)}
                  disabled={loading}
                  aria-haspopup="true"
                  aria-expanded={isNewMeetingMenuOpen}
                  className="w-full h-12 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center justify-between gap-2.5 text-sm shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-5 h-5 shrink-0" />
                    <span>{loading ? t.hero.btnCreating : t.hero.btnCreate}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isNewMeetingMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isNewMeetingMenuOpen && (
                  <div
                    role="menu"
                    className="absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-800 shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleCreateForLater}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {ui.menuCreateForLater}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                          {ui.menuCreateForLaterDesc}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleStartInstantMeeting}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {ui.menuStartInstant}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                          {ui.menuStartInstantDesc}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleOpenSchedule}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {ui.menuSchedule}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                          {ui.menuScheduleDesc}
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Join with Code inline */}
              <form onSubmit={handleJoinWithCode} className="flex items-center gap-2">
                <div className="relative flex-1 flex items-center rounded-xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 transition-colors shadow-2xs">
                  <Keyboard className="w-4 h-4 text-zinc-400 ml-3 shrink-0" />
                  <input
                    type="text"
                    placeholder={t.hero.inputRoomCode}
                    value={meetingCodeInput}
                    onChange={(e) => {
                      setMeetingCodeInput(extractMeetingCode(e.target.value));
                      if (error) setError(null);
                    }}
                    aria-label={t.hero.inputRoomCode}
                    className="w-full bg-transparent px-3 py-2.5 text-sm uppercase font-mono tracking-wider outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!meetingCodeInput.trim()}
                  aria-label={t.hero.btnJoin}
                  className="h-11 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <span>{ui.joinShort}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* 3. Quick Secondary Actions: Schedule & History */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/calendar')}
                  className="h-11 px-3 rounded-xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{language === 'ja' ? '予定を設定' : language === 'en' ? 'Schedule' : 'Đặt lịch họp'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/history')}
                  className="h-11 px-3 rounded-xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{ui.historyNav}</span>
                </button>
              </div>
            </div>

            {/* Upcoming Meetings Strip on Mobile */}
            <div className="pt-2">
              <UpcomingMeetingsStrip
                refreshKey={scheduleRefreshKey}
                onOpenCalendar={() => navigate('/calendar')}
              />
            </div>

            {/* Mobile Feature Highlights: Instant Trust & Value Props */}
            <div className="pt-2 pb-1 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-white/80 dark:bg-[#18181c]/80 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-1 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    {t.hero.metricLatency}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    {t.hero.metricLatencySub}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/80 dark:bg-[#18181c]/80 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-1 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    RAM-Only
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    {t.hero.metricZeroSub}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/80 dark:bg-[#18181c]/80 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-1 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    {language === 'ja' ? '8言語' : language === 'en' ? '8 Languages' : '8 Ngôn ngữ'}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    {language === 'ja' ? '双方向翻訳' : language === 'en' ? 'Live subtitle' : 'Dịch song song'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── DESKTOP/TABLET: Focused Meeting Workspace Canvas (md+) ── */}
        <div className="flex flex-1 flex-col">
          {/* ── HOME section (default) ── */}
          {activeSection === 'home' && (
            <section
              id="hero"
              className="hidden md:flex flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 2xl:px-16 flex-col lg:flex-row items-center justify-between py-8 lg:py-12 gap-8 lg:gap-14 xl:gap-20"
            >
              {/* Left: Headline + Primary Actions */}
              <div className="w-full max-w-md sm:max-w-xl lg:max-w-xl xl:max-w-2xl space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs">
                  <Monitor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{ui.desktopBadge}</span>
                </div>

                <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-[1.12]">
                  {ui.heroDesktopTitle1}
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600">
                    {ui.heroDesktopTitleHighlight}
                  </span>
                  <span className="block text-2xl md:text-3xl font-semibold text-zinc-700 dark:text-zinc-300 mt-1">
                    {ui.heroDesktopTitleEnd}
                  </span>
                </h1>

                <p className="text-zinc-600 dark:text-zinc-400 text-base lg:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {ui.heroDesktopDesc}
                </p>

                {/* Primary Desktop Download CTA */}
                <div className="pt-1 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all cursor-pointer hover:-translate-y-0.5 group"
                  >
                    <Monitor className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>{ui.btnDownloadWindows}</span>
                    <ArrowRight className="w-4 h-4 ml-0.5 opacity-80 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {ui.downloadSubtext}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs">
                    {error}
                  </div>
                )}

                {/* Secondary: Quick Web Meeting Container (Preserves full test compatibility) */}
                <div className="pt-2 text-left bg-white/80 dark:bg-[#18181c]/80 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2">
                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                    {ui.orWebMeeting}
                  </span>

                  <div className="flex flex-row flex-wrap items-center justify-center lg:justify-start gap-2.5">
                    {/* Google Meet style New Meeting dropdown button */}
                    <div className="relative" ref={newMeetingMenuDesktopRef}>
                      <button
                        type="button"
                        onClick={() => setIsNewMeetingMenuOpen((prev) => !prev)}
                        disabled={loading}
                        aria-haspopup="true"
                        aria-expanded={isNewMeetingMenuOpen}
                        className="whitespace-nowrap px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed shadow-xs"
                      >
                        <Video className="w-4 h-4 shrink-0" />
                        <span>{loading ? t.hero.btnCreating : t.hero.btnCreate}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 ml-0.5 shrink-0 transition-transform duration-200 ${
                            isNewMeetingMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Google Meet Dropdown Menu */}
                      {isNewMeetingMenuOpen && (
                        <div
                          role="menu"
                          className="absolute top-full left-0 mt-2 z-30 w-84 rounded-2xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleCreateForLater}
                            className="w-full text-left p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors flex items-start gap-3 cursor-pointer group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              <Link2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {ui.menuCreateForLater}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                                {ui.menuCreateForLaterDesc}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleStartInstantMeeting}
                            className="w-full text-left p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors flex items-start gap-3 cursor-pointer group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 transition-colors">
                              <Plus className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {ui.menuStartInstant}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                                {ui.menuStartInstantDesc}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={handleOpenSchedule}
                            className="w-full text-left p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors flex items-start gap-3 cursor-pointer group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {ui.menuSchedule}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                                {ui.menuScheduleDesc}
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsScheduleMeetingOpen(true)}
                      className="whitespace-nowrap px-3.5 py-2.5 bg-white hover:bg-zinc-50 dark:bg-[#18181c] dark:hover:bg-[#222228] text-zinc-800 dark:text-zinc-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer border border-zinc-300 dark:border-zinc-800"
                    >
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <span>
                        {language === 'ja' ? '予定を設定' : language === 'en' ? 'Schedule' : 'Đặt lịch'}
                      </span>
                    </button>

                    {/* Unified Room Code Input */}
                    <form onSubmit={handleJoinWithCode} className="relative flex items-center">
                      <div className="relative flex items-center rounded-xl bg-white dark:bg-[#18181c] border border-zinc-300 dark:border-zinc-800 focus-within:border-blue-500 transition-all">
                        <Keyboard className="w-3.5 h-3.5 text-zinc-400 ml-3 shrink-0" />
                        <input
                          type="text"
                          placeholder={t.hero.inputRoomCode}
                          value={meetingCodeInput}
                          onChange={(e) => {
                            setMeetingCodeInput(extractMeetingCode(e.target.value));
                            if (error) setError(null);
                          }}
                          aria-label={t.hero.inputRoomCode}
                          className="w-32 sm:w-40 bg-transparent text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm font-medium px-2.5 py-2 outline-none uppercase font-mono tracking-wider placeholder-zinc-400 dark:placeholder-zinc-500"
                        />
                        <button
                          type="submit"
                          disabled={!meetingCodeInput.trim()}
                          className={`mr-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:cursor-default ${
                            meetingCodeInput.trim()
                              ? 'bg-blue-600 text-white hover:bg-blue-500'
                              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                          aria-label={t.hero.btnJoin}
                        >
                          <span>{t.hero.btnJoin}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </form>
                  </div>

                  <UpcomingMeetingsStrip
                    refreshKey={scheduleRefreshKey}
                    onOpenCalendar={() => navigate('/calendar')}
                  />
                </div>
              </div>

              {/* Right: Live Interactive Demo Studio Preview */}
              <div className="flex relative group shrink-0 w-full lg:w-auto justify-center">
                {isPreviewVisible ? (
                  <div className="relative">
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shadow-2xs backdrop-blur-md text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>LayaMeet Live Overlay • Zoom & Meet Companion</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                        Always-On-Top
                      </span>
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600/10 via-indigo-600/5 to-transparent rounded-3xl blur-xl pointer-events-none" />
                    <InteractiveMeetingPreview onClose={() => setIsPreviewVisible(false)} />
                  </div>
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

          {/* ── B2B SAAS DESKTOP COMPANION LANDING SECTIONS ── */}
          {activeSection === 'home' && (
            <DesktopLandingSections
              onOpenDownload={() => setIsDownloadModalOpen(true)}
              language={language}
            />
          )}

          {/* ── FEATURES section (inline) ── */}
          {/* ── Redirect inline section requests to dedicated full-page routes ── */}
          {activeSection === 'features' && <Navigate to="/features" replace />}
          {activeSection === 'pricing' && <Navigate to="/pricing" replace />}
          {activeSection === 'faq' && <Navigate to="/faq" replace />}
          {activeSection === 'contact' && <Navigate to="/contact" replace />}
        </div>

        {/* ── FOOTER COMPLIANCE SECTION ── */}
        <Footer
          onOpenStatusModal={() => navigate('/system-status')}
        />
      </main>

      {/* ── UNIFIED STREAMLINED NAVIGATION DRAWER ── */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsNavDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Container */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={ui.navDrawerTitle}
            className="relative z-10 w-full max-w-[280px] h-full bg-white dark:bg-[#141519] border-r border-zinc-200 dark:border-[#272832] p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto"
          >
            <div className="space-y-3">
              {/* Brand Header with Close (X) button */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-[#272832]">
                <LayaMeetLogo size="md" />
                <button
                  type="button"
                  onClick={() => setIsNavDrawerOpen(false)}
                  data-testid="nav-drawer-close-btn"
                  aria-label={ui.closeDrawer}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Essential Navigation Items Only */}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('home')}
                  data-testid="drawer-home"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeSection === 'home'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Home className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{ui.railHome}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('calendar')}
                  data-testid="drawer-calendar"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
                >
                  <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.calendarNav}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('history')}
                  data-testid="drawer-history"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
                >
                  <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.historyNav}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('features')}
                  data-testid="drawer-features"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeSection === 'features'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.railFeatures}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('pricing')}
                  data-testid="drawer-pricing"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeSection === 'pricing'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.railPricing}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('faq')}
                  data-testid="drawer-faq"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeSection === 'faq'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.railFaq}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('contact')}
                  data-testid="drawer-contact"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeSection === 'contact'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Phone className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.railContact}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('settings')}
                  data-testid="drawer-settings"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.settingsNav}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('tools')}
                  data-testid="drawer-tools"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
                >
                  <Zap className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{ui.toolsNav}</span>
                </button>
              </nav>
            </div>

            {user?.email && (
              <div className="pt-3 border-t border-zinc-200/80 dark:border-[#272832] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.fullName || user.email.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsNavDrawerOpen(false);
                    await signOut();
                  }}
                  title={language === 'ja' ? 'ログアウト' : language === 'en' ? 'Sign out' : 'Đăng xuất'}
                  aria-label="Sign out"
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleMeetingOpen}
        language={language}
        onClose={() => setIsScheduleMeetingOpen(false)}
        onCreated={() => setScheduleRefreshKey((value) => value + 1)}
      />

      {/* Create Meeting For Later Modal (Google Meet style) */}
      {createdMeetingForLaterCode && (
        <CreateMeetingForLaterModal
          isOpen={isCreateForLaterModalOpen}
          meetingCode={createdMeetingForLaterCode}
          onClose={() => setIsCreateForLaterModalOpen(false)}
        />
      )}

      {/* Legal & Terms Modal */}
      <LegalModal
        isOpen={legalModalType !== null}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      {/* Windows Desktop App Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        language={language}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
};
