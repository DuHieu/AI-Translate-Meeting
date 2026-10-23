import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Download,
  ShieldCheck,
  Radio,
  Terminal,
} from 'lucide-react';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { InteractiveMeetingPreview } from '../components/home/InteractiveMeetingPreview';
import { Footer } from '../components/common/Footer';
import { useLanguage } from '../context/language-context-def';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DownloadModal } from '../components/home/DownloadModal';
import { DesktopLandingSections } from '../components/home/DesktopLandingSections';
import { AppLanguage } from '../i18n';
import { PAYMENT_ENABLED } from '../config/featureFlags';
import { DESKTOP_RELEASE } from '../config/desktopRelease';

interface HomePageProps {
  forcedLanguage?: AppLanguage;
}

const HOME_UI: Record<string, Record<string, string>> = {
  vi: {
    versionLabel: `ENTERPRISE SUITE · v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Nền tảng họp trực tuyến độc lập.',
    heroH1Highlight: 'Phiên dịch song ngữ tức thì.',
    heroDesc:
      'Phòng họp video WebRTC độ trễ thấp tích hợp phụ đề Việt – Nhật – Anh (<350ms), thuyết minh giọng nói và biên bản họp tự động.',
    btnDownloadWindows: `Tải cho Windows (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: 'Quy trình 3 bước',
    mobileNote: 'Ứng dụng Windows 10/11 (64-bit). Sao chép liên kết để mở trên máy tính.',
    copyLink: 'Sao chép liên kết',
    linkCopied: 'Đã sao chép',
    downloadMicrocopy: 'Ký số bảo mật · Cài đặt không cần quyền Admin',
    statLatency: '<350ms',
    statLatencyLabel: 'Độ trễ phụ đề & giọng nói',
    statSecurity: '100% RAM',
    statSecurityLabel: 'Không lưu tệp âm thanh',
    statStandalone: 'All-in-One',
    statStandaloneLabel: 'Họp, Dịch AI & Biên bản',
    navFeatures: 'Phân hệ',
    navHowItWorks: 'Triển khai',
    navComparison: 'Đối chiếu',
    navPricing: 'Bảng giá',
    navFaq: 'Hỏi đáp',
    navDownload: 'Tải cho Windows',
  },
  en: {
    versionLabel: `ENTERPRISE SUITE · v${DESKTOP_RELEASE.version}`,
    heroH1Line1: 'Standalone video conferencing.',
    heroH1Highlight: 'Real-time bilingual translation.',
    heroDesc:
      'Low-latency WebRTC video rooms with built-in Vietnamese, Japanese, and English live subtitles (<350ms), voice dubbing, and AI minutes.',
    btnDownloadWindows: `Download for Windows (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: '3-step setup',
    mobileNote: 'For Windows 10/11 (64-bit). Copy link to open on your workstation.',
    copyLink: 'Copy link',
    linkCopied: 'Copied',
    downloadMicrocopy: 'Digitally signed · No Admin privileges required',
    statLatency: '<350ms',
    statLatencyLabel: 'Subtitle & voice latency',
    statSecurity: '100% RAM',
    statSecurityLabel: 'Zero audio files stored',
    statStandalone: 'All-in-One',
    statStandaloneLabel: 'Video, Translation & Minutes',
    navFeatures: 'Modules',
    navHowItWorks: 'Setup',
    navComparison: 'Comparison',
    navPricing: 'Pricing',
    navFaq: 'FAQ',
    navDownload: 'Download for Windows',
  },
  ja: {
    versionLabel: `ENTERPRISE SUITE · v${DESKTOP_RELEASE.version}`,
    heroH1Line1: '法人向け独立型ビデオ会議。',
    heroH1Highlight: 'リアルタイム双方向通訳。',
    heroDesc:
      '日・越・英の低遅延二言語字幕（<350ms）、AI音声通訳、自動議事録を単一システムに統合。100%メモリ処理で機密を保護。',
    btnDownloadWindows: `Windows版ダウンロード (${DESKTOP_RELEASE.sizeLabel})`,
    btnSeeSteps: '導入手順（3ステップ）',
    mobileNote: 'Windows 10/11 対応。リンクをコピーしてPCで開いてください。',
    copyLink: 'リンクをコピー',
    linkCopied: 'コピー完了',
    downloadMicrocopy: '電子署名済み · 管理者権限不要',
    statLatency: '<350ms',
    statLatencyLabel: '字幕・音声通訳の低遅延',
    statSecurity: '100% RAM',
    statSecurityLabel: '録音ファイル完全非保存',
    statStandalone: '完全独立型',
    statStandaloneLabel: '会議・通訳・議事録を統合',
    navFeatures: 'モジュール',
    navHowItWorks: '導入手順',
    navComparison: '仕様比較',
    navPricing: '料金',
    navFaq: 'Q&A',
    navDownload: 'Windows版',
  },
};

export const HomePage: React.FC<HomePageProps> = ({ forcedLanguage }) => {
  const { language } = useLanguage();
  const effectiveLanguage = forcedLanguage || language;
  const navigate = useNavigate();

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

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page min-h-dvh bg-[#D8DEE6] dark:bg-[#0E1218] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors overflow-x-hidden selection:bg-teal-500/20">
      {/* ── LOW-GLARE ERP TOP HEADER BAR ── */}
      <header className="sticky top-0 z-50 h-14 bg-[#E4E9F0]/95 dark:bg-[#131820]/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-800 px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LayaMeetLogo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => scrollToAnchor('features')}
              className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              {ui.navFeatures}
            </button>
            <button
              type="button"
              onClick={() => scrollToAnchor('how-it-works')}
              className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              {ui.navHowItWorks}
            </button>
            <button
              type="button"
              onClick={() => scrollToAnchor('comparison')}
              className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              {ui.navComparison}
            </button>
            {PAYMENT_ENABLED && (
              <Link
                to="/pricing"
                className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors cursor-pointer"
              >
                {ui.navPricing}
              </Link>
            )}
            <button
              type="button"
              onClick={() => scrollToAnchor('faq')}
              className="hover:text-[#0F766E] dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              {ui.navFaq}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />

            <button
              type="button"
              onClick={() => navigate('/desktop')}
              className="hidden sm:flex px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#18202C] hover:bg-slate-300/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-[#0F766E] dark:text-teal-400" />
              <span>IT Console</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDownloadModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ui.navDownload}</span>
              <span className="sm:hidden">Tải về</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ERP CONTENT ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {/* ── CONCISE HERO SECTION ── */}
        <section id="hero" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left 6 Columns: Minimalist Executive Pitch */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#CBD3DE] dark:bg-[#18202B] border border-slate-300 dark:border-slate-700/80 text-[11px] font-mono font-semibold text-slate-700 dark:text-teal-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] dark:bg-teal-400" />
                <span>{ui.versionLabel}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.18]">
                {ui.heroH1Line1}{' '}
                <span className="text-[#0F766E] dark:text-teal-400 block mt-0.5">
                  {ui.heroH1Highlight}
                </span>
              </h1>

              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                {ui.heroDesc}
              </p>

              {/* Controls */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="px-5 py-2.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{ui.btnDownloadWindows}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const code = `P2P-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                    navigate(`/meeting/${code}?mode=p2p`);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-[#E4E9F0] dark:bg-[#18202C] hover:bg-[#CFD6E0] dark:hover:bg-slate-800 text-[#0F766E] dark:text-teal-300 font-semibold text-sm flex items-center justify-center gap-2 border border-teal-600/40 dark:border-teal-700/60 transition-colors cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Họp P2P Ngay (Không Server)</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/desktop')}
                  className="px-4 py-2.5 rounded-lg bg-[#E4E9F0] dark:bg-[#18202C] hover:bg-[#CFD6E0] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <span>Mở ERP Console</span>
                </button>
              </div>

              {/* Mobile Copy Link */}
              <div className="md:hidden rounded-lg border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#161C26] p-3 text-left space-y-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">{ui.mobileNote}</p>
                <button
                  type="button"
                  onClick={copyPageLink}
                  className="px-3 py-1 rounded bg-[#0F766E] text-xs font-semibold text-white cursor-pointer"
                >
                  <span aria-live="polite">{linkCopied ? ui.linkCopied : ui.copyLink}</span>
                </button>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#0F766E] dark:text-teal-400" />
                <span>{ui.downloadMicrocopy}</span>
              </p>

              {/* Compact 3-Metric Inline Strip */}
              <div className="pt-4 border-t border-slate-300 dark:border-slate-800 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {ui.statLatency}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    {ui.statLatencyLabel}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {ui.statSecurity}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    {ui.statSecurityLabel}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {ui.statStandalone}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    {ui.statStandaloneLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 6 Columns: Live Conference Preview */}
            <div className="lg:col-span-6 w-full">
              <InteractiveMeetingPreview />
            </div>
          </div>
        </section>

        {/* ── CONCISE ERP SECTIONS ────────────────────────────────── */}
        <DesktopLandingSections
          onOpenDownload={() => setIsDownloadModalOpen(true)}
          language={effectiveLanguage}
        />
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <Footer onOpenStatusModal={() => navigate('/system-status')} />

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        language={effectiveLanguage}
      />
    </div>
  );
};
