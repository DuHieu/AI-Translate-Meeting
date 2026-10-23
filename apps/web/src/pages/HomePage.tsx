import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  X,
  Download,
  ArrowRight,
  ShieldCheck,
  Home,
  CreditCard,
  HelpCircle,
  Phone,
  Layers,
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
    railFeatures: 'Kiến trúc & Tính năng',
    railPricing: 'Bảng giá',
    railFaq: 'Câu hỏi thường gặp',
    railContact: 'Tư vấn On-Premise',
    closeDrawer: 'Đóng',
    versionLabel: `WINDOWS DESKTOP · v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Phụ đề song ngữ thời gian thực',
    heroH1Highlight: 'cho Zoom, Teams và Google Meet.',
    heroDesc:
      'LayaMeet bắt trực tiếp âm thanh hệ thống qua WASAPI Loopback và hiển thị thanh phụ đề nổi hai chiều ngay trên màn hình. Không cần mời bot vào phòng, không lưu âm thanh xuống ổ cứng.',
    btnDownloadWindows: `Tải cho Windows (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: 'Xem quy trình cài đặt',
    mobileNote: 'Bản cài đặt dành cho Windows 10/11 (64-bit). Sao chép liên kết để mở trên máy tính của bạn.',
    copyLink: 'Sao chép liên kết',
    linkCopied: 'Đã sao chép',
    downloadMicrocopy: 'Ký số bởi LayaMeet AI Technologies · Cài đặt User-space (Không cần quyền Admin)',
    statLatency: '<350ms',
    statLatencyLabel: 'Độ trễ nhận diện & dịch (p50 ~86ms)',
    statSecurity: '100% RAM',
    statSecurityLabel: 'Xử lý trên bộ nhớ tạm, không lưu file ghi âm',
    statNoBot: 'Zero Bot',
    statNoBotLabel: 'Tự động bắt âm thanh hệ thống, đối tác không cần cài',
    navFeatures: 'Tính năng',
    navHowItWorks: 'Cài đặt',
    navComparison: 'So sánh kỹ thuật',
    navPricing: 'Bảng giá',
    navFaq: 'Hỏi đáp',
    navDownload: 'Tải về cho Windows',
  },
  en: {
    navDrawerTitle: 'LayaMeet Navigation Menu',
    railHome: 'Home',
    railFeatures: 'Architecture & Features',
    railPricing: 'Pricing',
    railFaq: 'FAQ',
    railContact: 'Enterprise On-Prem',
    closeDrawer: 'Close',
    versionLabel: `WINDOWS DESKTOP · v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Real-time bilingual subtitles',
    heroH1Highlight: 'for Zoom, Teams, and Google Meet.',
    heroDesc:
      'LayaMeet captures dual-channel system audio directly via WASAPI Loopback and renders an always-on-top subtitle overlay. Zero meeting bots required, zero raw audio written to disk.',
    btnDownloadWindows: `Download for Windows (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: 'Installation guide',
    mobileNote: 'Built for Windows 10/11 (64-bit). Copy this link to open on your computer.',
    copyLink: 'Copy link',
    linkCopied: 'Copied',
    downloadMicrocopy: 'Signed by LayaMeet AI Technologies · User-space installer (No Admin privileges required)',
    statLatency: '<350ms',
    statLatencyLabel: 'End-to-end STT & translation latency',
    statSecurity: '100% RAM',
    statSecurityLabel: 'Ephemeral memory processing, zero audio files stored',
    statNoBot: 'Zero Bot',
    statNoBotLabel: 'Direct soundcard capture, no participant setup',
    navFeatures: 'Features',
    navHowItWorks: 'Setup',
    navComparison: 'Benchmarks',
    navPricing: 'Pricing',
    navFaq: 'FAQ',
    navDownload: 'Download for Windows',
  },
  ja: {
    navDrawerTitle: 'LayaMeet ナビゲーションメニュー',
    railHome: 'ホーム',
    railFeatures: '機能・アーキテクチャ',
    railPricing: '料金プラン',
    railFaq: 'よくある質問',
    railContact: 'オンプレミス導入相談',
    closeDrawer: '閉じる',
    versionLabel: `WINDOWS デスクトップ · v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Zoom・Teams・Meet対応の',
    heroH1Highlight: 'リアルタイム双方向字幕ソフトウェア。',
    heroDesc:
      'WASAPIループバックによりPCのシステム音声とマイクを直接分離キャプチャし、最前面に二言語字幕を表示します。会議へのボット招待や音声ファイルの保存は一切不要です。',
    btnDownloadWindows: `Windows版をダウンロード (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: '導入手順を見る',
    mobileNote: 'Windows 10/11 (64-bit) 対応。リンクをコピーしてPCで開いてください。',
    copyLink: 'リンクをコピー',
    linkCopied: 'コピー完了',
    downloadMicrocopy: 'LayaMeet AI Technologies 署名済み · 管理者権限不要でインストール可能',
    statLatency: '<350ms',
    statLatencyLabel: '音声認識・翻訳の低遅延ストリーミング',
    statSecurity: '100% RAM',
    statSecurityLabel: 'メモリ上のみで処理し、音声データは即時破棄',
    statNoBot: 'ボット不要',
    statNoBotLabel: 'システム音声直接取得・相手側の設定ゼロ',
    navFeatures: '機能一覧',
    navHowItWorks: '導入手順',
    navComparison: '技術比較',
    navPricing: '料金',
    navFaq: 'Q&A',
    navDownload: 'Windows版ダウンロード',
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
    }
  };

  return (
    <div className="home-page min-h-dvh bg-[#FAF9F6] dark:bg-[#0D0E11] text-zinc-900 dark:text-[#F3F4F6] flex flex-col font-sans transition-colors overflow-x-hidden">
      {/* ── MOBILE NAVBAR (< md) ─────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 h-14 px-4 bg-[#FAF9F6]/95 dark:bg-[#0D0E11]/95 backdrop-blur-md border-b border-zinc-200 dark:border-[#1E2025] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="mobile-hamburger-btn"
            aria-label={ui.navDrawerTitle}
            className="w-9 h-9 -ml-1 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-[#17191D] transition-colors cursor-pointer"
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
            className="px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Windows</span>
          </button>
        </div>
      </header>

      {/* ── DESKTOP NAVBAR (md+) ────────────────────────────────── */}
      <header className="hidden md:flex sticky top-0 left-0 right-0 h-14 border-b border-zinc-200 dark:border-[#1E2025] bg-[#FAF9F6]/95 dark:bg-[#0D0E11]/95 backdrop-blur-md px-6 lg:px-12 items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsNavDrawerOpen(true)}
            data-testid="header-logo-menu-btn"
            aria-label={ui.navDrawerTitle}
            title={ui.navDrawerTitle}
            className="w-8 h-8 -ml-1 rounded-md flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-[#17191D] transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <LayaMeetLogo size="md" />
          </Link>
        </div>

        <nav className="flex items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => scrollToAnchor('features')}
            className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {ui.navFeatures}
          </button>
          <button
            type="button"
            onClick={() => scrollToAnchor('how-it-works')}
            className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {ui.navHowItWorks}
          </button>
          <button
            type="button"
            onClick={() => scrollToAnchor('comparison')}
            className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {ui.navComparison}
          </button>
          {PAYMENT_ENABLED && (
            <Link
              to="/pricing"
              className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              {ui.navPricing}
            </Link>
          )}
          <button
            type="button"
            onClick={() => scrollToAnchor('faq')}
            className="hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {ui.navFaq}
          </button>
        </nav>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setIsDownloadModalOpen(true)}
            className="px-3.5 py-2 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{ui.navDownload}</span>
          </button>
        </div>
      </header>

      {/* ── MAIN EDITORIAL CONTENT ──────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {/* ── ARCHITECTURAL HERO SECTION ────────────────────────── */}
        <section id="hero" className="border-b border-zinc-200 dark:border-[#1E2025]">
          <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              {/* Left 6 Columns: Editorial Typography & Controls */}
              <div className="lg:col-span-6 space-y-6 pt-2">
                <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{ui.versionLabel}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl xl:text-[44px] font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.15]">
                  {ui.heroH1Line1}{' '}
                  <span className="text-zinc-600 dark:text-zinc-300 font-semibold block sm:inline">
                    {ui.heroH1Highlight}
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                  {ui.heroDesc}
                </p>

                {/* Crisp Utilitarian Controls */}
                <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="px-5 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{ui.btnDownloadWindows}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToAnchor('how-it-works')}
                    className="px-4 py-3 rounded-lg bg-white dark:bg-[#14161B] hover:bg-zinc-100 dark:hover:bg-[#1B1E25] text-zinc-800 dark:text-zinc-200 font-medium text-sm flex items-center justify-center gap-2 border border-zinc-300 dark:border-[#262930] transition-colors cursor-pointer"
                  >
                    <span>{ui.btnSeeSteps}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>

                {/* Mobile Copy Link Box */}
                <div className="md:hidden rounded-lg border border-zinc-200 dark:border-[#22252C] bg-zinc-100/70 dark:bg-[#14161B] p-3.5 text-left space-y-2">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{ui.mobileNote}</p>
                  <button
                    type="button"
                    onClick={copyPageLink}
                    className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-800 text-xs font-medium text-white cursor-pointer"
                  >
                    <span aria-live="polite">{linkCopied ? ui.linkCopied : ui.copyLink}</span>
                  </button>
                </div>

                {/* Code-Signing Verification Line */}
                <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                  <span>{ui.downloadMicrocopy}</span>
                </p>
              </div>

              {/* Right 6 Columns: Realistic Windows 11 Product Interface */}
              <div className="lg:col-span-6 w-full">
                <InteractiveMeetingPreview />
              </div>
            </div>

            {/* ── Hairline Architectural Metrics Bar ── */}
            <div className="mt-12 lg:mt-16 pt-8 border-t border-zinc-200 dark:border-[#1E2025] grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  {ui.statLatency}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {ui.statLatencyLabel}
                </div>
              </div>

              <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:dark:border-[#1E2025] sm:pl-8">
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  {ui.statSecurity}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {ui.statSecurityLabel}
                </div>
              </div>

              <div className="space-y-1 sm:border-l sm:border-zinc-200 sm:dark:border-[#1E2025] sm:pl-8">
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-950 dark:text-white tabular-nums">
                  {ui.statNoBot}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {ui.statNoBotLabel}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ARCHITECTURAL LANDING SECTIONS ─────────────────────── */}
        <DesktopLandingSections
          onOpenDownload={() => setIsDownloadModalOpen(true)}
          language={effectiveLanguage}
        />
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <Footer onOpenStatusModal={() => navigate('/system-status')} />

      {/* ── NAVIGATION DRAWER ────────────────────────────────────── */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsNavDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={ui.navDrawerTitle}
            className="relative z-10 w-full max-w-[280px] h-full bg-[#FAF9F6] dark:bg-[#111317] border-r border-zinc-200 dark:border-[#22252C] p-5 flex flex-col justify-between shadow-2xl overflow-y-auto"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-[#22252C]">
                <LayaMeetLogo size="md" />
                <button
                  type="button"
                  onClick={() => setIsNavDrawerOpen(false)}
                  data-testid="nav-drawer-close-btn"
                  aria-label={ui.closeDrawer}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-[#1A1D24] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('home')}
                  data-testid="drawer-home"
                  className="w-full px-3 py-2 rounded-md flex items-center gap-3 text-xs font-semibold text-zinc-950 dark:text-white bg-zinc-200/70 dark:bg-[#1B1E25] cursor-pointer text-left"
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>{ui.railHome}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('features')}
                  data-testid="drawer-features"
                  className="w-full px-3 py-2 rounded-md flex items-center gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#17191F] transition-colors cursor-pointer text-left"
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>{ui.railFeatures}</span>
                </button>

                {PAYMENT_ENABLED && (
                  <button
                    type="button"
                    onClick={() => handleSelectDrawerItem('pricing')}
                    data-testid="drawer-pricing"
                    className="w-full px-3 py-2 rounded-md flex items-center gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#17191F] transition-colors cursor-pointer text-left"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>{ui.railPricing}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('faq')}
                  data-testid="drawer-faq"
                  className="w-full px-3 py-2 rounded-md flex items-center gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#17191F] transition-colors cursor-pointer text-left"
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{ui.railFaq}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('contact')}
                  data-testid="drawer-contact"
                  className="w-full px-3 py-2 rounded-md flex items-center gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-[#17191F] transition-colors cursor-pointer text-left"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{ui.railContact}</span>
                </button>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNavDrawerOpen(false);
                      setIsDownloadModalOpen(true);
                    }}
                    className="w-full px-4 py-2.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{ui.btnDownloadWindows}</span>
                  </button>
                </div>
              </nav>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-[#22252C] text-[11px] text-zinc-500">
              © {new Date().getFullYear()} LayaMeet AI Technologies
            </div>
          </aside>
        </div>
      )}

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        language={effectiveLanguage}
      />
    </div>
  );
};
