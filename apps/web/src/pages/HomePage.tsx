import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  X,
  Monitor,
  Download,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Home,
  CreditCard,
  HelpCircle,
  Phone,
  Zap,
  Lock,
  UserCheck,
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { InteractiveMeetingPreview } from '../components/home/InteractiveMeetingPreview';
import { Footer } from '../components/common/Footer';
import { useLanguage } from '../context/language-context-def';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DownloadModal } from '../components/home/DownloadModal';
import { DesktopLandingSections } from '../components/home/DesktopLandingSections';
import { scrollLock } from '../utils/scrollLock';
import { AppLanguage } from '../i18n';
import { PAYMENT_ENABLED } from '../config/featureFlags';
import { DESKTOP_RELEASE } from '../config/desktopRelease';

interface HomePageProps {
  forcedLanguage?: AppLanguage;
}

const HOME_UI: Record<string, Record<string, string>> = {
  vi: {
    navDrawerTitle: 'Menu điều hướng LayaMeet',
    railHome: 'Trang chủ',
    railFeatures: 'Tính năng',
    railPricing: 'Bảng giá',
    railFaq: 'Hỏi đáp',
    railContact: 'Tư vấn On-Prem',
    calendarNav: 'Lịch cuộc họp',
    historyNav: 'Lịch sử cuộc họp',
    toolsNav: 'Cài đặt AI & API Key',
    settingsNav: 'Cài đặt & Giao diện',
    closeDrawer: 'Đóng',
    desktopBadge: `LayaMeet Desktop Companion • v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Phần Mềm Dịch Cuộc Họp Trực Tiếp',
    heroH1Highlight: 'Song Ngữ AI Cho Zoom & Teams',
    heroDesc: 'Nói tiếng mẹ đẻ, hiểu đối tác tức thì. LayaMeet tự động bắt âm thanh từ máy tính và hiển thị thanh phụ đề nổi song ngữ thời gian thực mà không cần đổi phần mềm họp, không cần mời bot vào phòng.',
    btnDownloadWindows: `Tải cho Windows (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: 'Xem cách cài đặt (3 bước)',
    mobileNote: 'Bản Windows cài trên máy tính. Gửi link này sang máy tính của bạn để tải.',
    copyLink: 'Sao chép link',
    linkCopied: 'Đã sao chép',
    downloadMicrocopy: 'Đã ký số bởi LayaMeet AI Technologies · Cài cho riêng bạn, không cần quyền Admin · Windows 10/11',
    statLatency: '<350ms',
    statLatencyLabel: 'Độ trễ thời gian thực',
    statSecurity: '100% RAM-Only',
    statSecurityLabel: 'Không lưu file âm thanh',
    statNoBot: 'Zero Bot',
    statNoBotLabel: 'Đối tác không cần cài đặt',
    navFeatures: 'Tính Năng',
    navHowItWorks: 'Cách Hoạt Động',
    navComparison: 'So Sánh',
    navPricing: 'Bảng Giá',
    navFaq: 'Hỏi Đáp',
    navDownload: 'Tải Desktop App',
    liveOverlayBadge: 'Thanh Phụ Đề Nổi Trong Suốt',
    liveOverlaySubtitle: 'Chạy đè lên Zoom, Google Meet & Microsoft Teams',
    alwaysOnTopPill: 'Always-On-Top',
  },
  en: {
    navDrawerTitle: 'LayaMeet Navigation Menu',
    railHome: 'Home',
    railFeatures: 'Features',
    railPricing: 'Pricing',
    railFaq: 'FAQ',
    railContact: 'Enterprise On-Prem',
    calendarNav: 'Calendar',
    historyNav: 'Meeting History',
    toolsNav: 'AI & BYOK Settings',
    settingsNav: 'Settings & Appearance',
    closeDrawer: 'Close',
    desktopBadge: `LayaMeet Desktop Companion • v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Real-Time AI Meeting Translation &',
    heroH1Highlight: 'Live Subtitles for Zoom & Teams',
    heroDesc: 'Speak your native language and understand your global partners instantly. LayaMeet captures system audio directly and displays an always-on-top bilingual subtitle bar without requiring bot invites.',
    btnDownloadWindows: `Download for Windows (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: 'Quick 3-step Setup',
    mobileNote: 'The Windows app installs on a computer. Send this link to your PC to download it.',
    copyLink: 'Copy link',
    linkCopied: 'Copied',
    downloadMicrocopy: 'Signed by LayaMeet AI Technologies · Per-user install, no Admin rights · Windows 10/11',
    statLatency: '<350ms',
    statLatencyLabel: 'Ultra-low Latency',
    statSecurity: '100% RAM-Only',
    statSecurityLabel: 'Zero Raw Audio Stored',
    statNoBot: 'Zero Bot',
    statNoBotLabel: 'Partners need no setup',
    navFeatures: 'Features',
    navHowItWorks: 'How It Works',
    navComparison: 'Comparison',
    navPricing: 'Pricing',
    navFaq: 'FAQ',
    navDownload: 'Download App',
    liveOverlayBadge: 'Always-On-Top Subtitle Overlay',
    liveOverlaySubtitle: 'Floating seamlessly over Zoom, Meet & Teams',
    alwaysOnTopPill: 'Always-On-Top',
  },
  ja: {
    navDrawerTitle: 'LayaMeet ナビゲーションメニュー',
    railHome: 'ホーム',
    railFeatures: '機能一覧',
    railPricing: '料金プラン',
    railFaq: 'よくある質問',
    railContact: 'エンタープライズ相談',
    calendarNav: '会議カレンダー',
    historyNav: '会議履歴',
    toolsNav: 'AI・BYOK設定',
    settingsNav: '設定・外観',
    closeDrawer: '閉じる',
    desktopBadge: `LayaMeet デスクトップ • v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Zoom・Teams・Meet対応',
    heroH1Highlight: 'リアルタイムAI双方向通訳＆フローティング字幕',
    heroDesc: '母国語で話し、相手の発言をリアルタイムで理解。ボットの招待や会議ツールの変更は不要。画面最前面の透明字幕バーで低遅延<350msの双方向翻訳を提供します。',
    btnDownloadWindows: `Windows版をダウンロード (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: 'インストール手順を見る',
    mobileNote: 'Windows版はPC用です。このリンクをPCに送ってダウンロードしてください。',
    copyLink: 'リンクをコピー',
    linkCopied: 'コピーしました',
    downloadMicrocopy: 'LayaMeet AI Technologies 署名済み · 管理者権限不要 · Windows 10/11',
    statLatency: '<350ms',
    statLatencyLabel: '超低遅延ストリーミング',
    statSecurity: '100% RAM-Only',
    statSecurityLabel: '音声ファイル完全非保存',
    statNoBot: 'ボット招待不要',
    statNoBotLabel: '相手への導入負担ゼロ',
    navFeatures: '機能紹介',
    navHowItWorks: '使い方',
    navComparison: '他社比較',
    navPricing: '料金',
    navFaq: 'Q&A',
    navDownload: 'アプリをダウンロード',
    liveOverlayBadge: '最前面フローティング字幕バー',
    liveOverlaySubtitle: 'Zoom、Meet、Teamsの画面上に自然に重ねて表示',
    alwaysOnTopPill: '最前面固定',
  },
};

export const HomePage: React.FC<HomePageProps> = ({ forcedLanguage }) => {
  const { language } = useLanguage();
  const effectiveLanguage = forcedLanguage || language;
  const navigate = useNavigate();

  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyPageLink = () => {
    void navigator.clipboard?.writeText(window.location.origin).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const langKey = effectiveLanguage === 'ja' ? 'ja' : effectiveLanguage === 'en' ? 'en' : 'vi';
  const ui = HOME_UI[langKey] || HOME_UI.vi;

  useEffect(() => {
    if (isNavDrawerOpen || isDownloadModalOpen) {
      scrollLock.lock();
    } else {
      scrollLock.unlock();
    }
    return () => scrollLock.unlock();
  }, [isNavDrawerOpen, isDownloadModalOpen]);

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectDrawerItem = (id: string) => {
    setIsNavDrawerOpen(false);
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (id === 'features') {
      scrollToAnchor('features');
    } else if (id === 'pricing') {
      navigate('/pricing');
    } else if (id === 'faq') {
      scrollToAnchor('faq');
    } else if (id === 'contact') {
      navigate('/contact');
    } else if (id === 'status') {
      navigate('/system-status');
    } else if (id === 'calendar') {
      navigate('/calendar');
    } else if (id === 'history') {
      navigate('/history');
    } else if (id === 'tools') {
      navigate('/settings?tab=ai_byok');
    } else if (id === 'settings') {
      navigate('/settings');
    }
  };

  return (
    <div className="home-page relative min-h-dvh bg-[#07090E] text-slate-100 flex flex-col font-sans transition-colors overflow-x-hidden selection:bg-sky-500/30 selection:text-sky-200">
      {/* ── AMBIENT BACKGROUND GLOW (Linear / Envato 2026 Style) ─── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.18)_0%,rgba(99,102,241,0.12)_40%,transparent_70%)] blur-3xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute top-[800px] -left-48 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute top-[1400px] -right-48 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* ── MOBILE NAVBAR (< md) ─────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 h-16 px-4 bg-[#07090E]/85 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between shadow-lg shadow-black/40">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="mobile-hamburger-btn"
            aria-label={ui.navDrawerTitle}
            className="w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <LayaMeetLogo size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsDownloadModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải App</span>
          </button>
        </div>
      </header>

      {/* ── DESKTOP NAVBAR (md+) ────────────────────────────────── */}
      <header className="hidden md:flex sticky top-0 left-0 right-0 h-16 border-b border-white/[0.08] bg-[#07090E]/80 backdrop-blur-xl px-6 lg:px-12 items-center justify-between shrink-0 z-50 transition-colors shadow-lg shadow-black/30">
        {/* Left: Brand Logo & Hamburger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="header-logo-menu-btn"
            aria-label={ui.navDrawerTitle}
            title={ui.navDrawerTitle}
            className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <LayaMeetLogo size="md" />
            <span className="hidden xl:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/25">
              Desktop AI
            </span>
          </Link>
        </div>

        {/* Center: Anchor Links */}
        <nav className="flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => scrollToAnchor('features')}
            className="hover:text-white hover:bg-white/[0.04] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {ui.navFeatures}
          </button>
          <button
            type="button"
            onClick={() => scrollToAnchor('how-it-works')}
            className="hover:text-white hover:bg-white/[0.04] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {ui.navHowItWorks}
          </button>
          <button
            type="button"
            onClick={() => scrollToAnchor('comparison')}
            className="hover:text-white hover:bg-white/[0.04] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {ui.navComparison}
          </button>
          {PAYMENT_ENABLED && (
            <Link
              to="/pricing"
              className="hover:text-white hover:bg-white/[0.04] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              {ui.navPricing}
            </Link>
          )}
          <button
            type="button"
            onClick={() => scrollToAnchor('faq')}
            className="hover:text-white hover:bg-white/[0.04] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            {ui.navFaq}
          </button>
        </nav>

        {/* Right: Theme Toggle, Language Switcher & Download CTA */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setIsDownloadModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/35 transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>{ui.navDownload}</span>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CANVAS ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {/* ── HERO SECTION (Ultra-Modern Glassmorphic B2B Hero) ───── */}
        <section
          id="hero"
          className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-14 pb-16 lg:pt-20 lg:pb-24 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16"
        >
          {/* Left Column: Headline, CTA, trust line */}
          <div className="w-full lg:max-w-xl xl:max-w-2xl space-y-7 text-center lg:text-left">
            {/* Top Glowing Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-200 text-xs sm:text-sm font-medium backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>{ui.desktopBadge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-[58px] font-extrabold tracking-tight text-white leading-[1.12]">
              {ui.heroH1Line1}{' '}
              <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {ui.heroH1Highlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              {ui.heroDesc}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              >
                <Download className="w-5 h-5" />
                <span>{ui.btnDownloadWindows}</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToAnchor('how-it-works')}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white font-semibold text-base flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 backdrop-blur-md transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              >
                <span>{ui.btnSeeSteps}</span>
                <ArrowRight className="w-4 h-4 text-sky-400" />
              </button>
            </div>

            {/* Mobile Note */}
            <div className="md:hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left space-y-2 backdrop-blur-md">
              <p className="text-xs text-slate-300">{ui.mobileNote}</p>
              <button
                type="button"
                onClick={copyPageLink}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer transition-colors"
              >
                <span aria-live="polite">{linkCopied ? ui.linkCopied : ui.copyLink}</span>
              </button>
            </div>

            {/* Trust Microcopy */}
            <p className="flex items-start justify-center lg:justify-start gap-2 text-xs sm:text-sm text-slate-400">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <span>{ui.downloadMicrocopy}</span>
            </p>

            {/* 3 Trust Metric Cards */}
            <div className="pt-2 grid grid-cols-3 gap-3 border-t border-white/[0.08]">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold text-base sm:text-lg">
                  <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{ui.statLatency}</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{ui.statLatencyLabel}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-base sm:text-lg">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{ui.statSecurity}</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{ui.statSecurityLabel}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-base sm:text-lg">
                  <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>{ui.statNoBot}</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{ui.statNoBotLabel}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Subtitle Window Mockup */}
          <div className="w-full lg:max-w-lg xl:max-w-xl shrink-0">
            <div className="relative rounded-2xl bg-[#0D121F]/90 p-3 sm:p-5 border border-white/[0.12] shadow-2xl backdrop-blur-2xl ring-1 ring-white/10">
              {/* Window Header */}
              <div className="mb-3.5 px-3.5 py-2 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-between text-xs font-medium text-slate-300">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-slate-500">|</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-slate-200">{ui.liveOverlayBadge}</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-bold tracking-wide">
                  {ui.alwaysOnTopPill}
                </span>
              </div>

              {/* Interactive Meeting Preview Engine */}
              <InteractiveMeetingPreview onClose={() => {}} />
            </div>
          </div>
        </section>

        {/* ── COMPREHENSIVE DESKTOP LANDING SECTIONS ─────────────── */}
        <DesktopLandingSections
          onOpenDownload={() => setIsDownloadModalOpen(true)}
          language={effectiveLanguage}
        />
      </main>

      {/* ── FOOTER SECTION ───────────────────────────────────────── */}
      <Footer onOpenStatusModal={() => navigate('/system-status')} />

      {/* ── NAVIGATION DRAWER (For Mobile & Power Shortcuts) ────── */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsNavDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Container */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={ui.navDrawerTitle}
            className="relative z-10 w-full max-w-[290px] h-full bg-[#0B0F19] border-r border-white/10 p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto"
          >
            <div className="space-y-4">
              {/* Brand Header with Close (X) button */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <LayaMeetLogo size="md" />
                <button
                  type="button"
                  onClick={() => setIsNavDrawerOpen(false)}
                  data-testid="nav-drawer-close-btn"
                  aria-label={ui.closeDrawer}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items (All testid preserved) */}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('home')}
                  data-testid="drawer-home"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 cursor-pointer text-left"
                >
                  <Home className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{ui.railHome}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('features')}
                  data-testid="drawer-features"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                >
                  <Sparkles className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{ui.railFeatures}</span>
                </button>

                {PAYMENT_ENABLED && (
                  <button
                    type="button"
                    onClick={() => handleSelectDrawerItem('pricing')}
                    data-testid="drawer-pricing"
                    className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                  >
                    <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{ui.railPricing}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('faq')}
                  data-testid="drawer-faq"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{ui.railFaq}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('contact')}
                  data-testid="drawer-contact"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                >
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{ui.railContact}</span>
                </button>

                {/* Mobile Download CTA inside drawer */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavDrawerOpen(false);
                      setIsDownloadModalOpen(true);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>{ui.btnDownloadWindows}</span>
                  </button>
                </div>
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 text-[11px] text-slate-500">
              © 2026 LayaMeet AI Technologies
            </div>
          </aside>
        </div>
      )}

      {/* Download Modal Component */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        language={effectiveLanguage}
      />
    </div>
  );
};
