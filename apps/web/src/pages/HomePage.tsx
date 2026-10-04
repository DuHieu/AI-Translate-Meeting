import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { meetingApi } from '../api/meetingApi';
import { Plus, ArrowRight, ShieldCheck, Globe, Mic, FileText, Building2 } from 'lucide-react';
import { admissionStorage } from '../utils/admissionStorage';
import { SystemStatusModal } from '../components/system/SystemStatusModal';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { InteractiveMeetingPreview } from '../components/home/InteractiveMeetingPreview';
import { PricingSection } from '../components/home/PricingSection';
import { FAQSection } from '../components/home/FAQSection';
import { ContactSection } from '../components/home/ContactSection';
import { Footer } from '../components/common/Footer';
import { LegalModal } from '../components/common/LegalModal';
import { EnterpriseSsoModal } from '../components/home/EnterpriseSsoModal';
import { useLanguage } from '../context/language-context-def';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { NeuralLinguisticBackground } from '../components/common/NeuralLinguisticBackground';

// Feature highlights — language-agnostic, applies to any language pair
const FEATURES = [
  {
    icon: Mic,
    title: 'Phụ đề thời gian thực',
    desc: 'Nhận dạng giọng nói tức thì với Whisper, hỗ trợ Tiếng Việt, Nhật, Anh và nhiều hơn nữa.',
  },
  {
    icon: Globe,
    title: 'Dịch song ngữ trực tiếp',
    desc: 'Dịch ngay trong cuộc họp với bộ nhớ đệm thông minh — không độ trễ, không phụ thuộc dịch vụ đám mây.',
  },
  {
    icon: FileText,
    title: 'Biên bản & Action Items',
    desc: 'Tự động trích xuất việc cần làm và quyết định, xuất Markdown hoặc Word chỉ với 1 cú nhấp.',
  },
  {
    icon: ShieldCheck,
    title: 'On-Premise / Riêng tư',
    desc: 'Âm thanh không rời máy chủ nội bộ. Không lưu file audio, không dữ liệu bên thứ ba.',
  },
];

export const HomePage: React.FC = () => {
  const SHOW_ENTERPRISE_SSO = false; // Tạm thời ẩn Enterprise SSO để tránh lỗi 404 khi chưa cấu hình SSO provider
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isEnterpriseSsoOpen, setIsEnterpriseSsoOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  const handleCreateNewMeeting = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await meetingApi.createMeeting('LayaMeet');
      admissionStorage.saveHostToken(res.meetingCode, res.hostToken);
      navigate(`/prejoin/${res.meetingCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo phòng họp';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCodeInput.trim()) {
      setError('Vui lòng nhập mã phòng họp.');
      return;
    }
    setError(null);
    navigate(`/prejoin/${meetingCodeInput.trim().toUpperCase()}`);
  };

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-[#0f0f10] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors overflow-x-hidden">
      {/* ── Interactive Neural Linguistic Synapse Network (Mouse reactive) ── */}
      <NeuralLinguisticBackground />

      {/* ── Background Atmospheric Light Layer (Full Viewport, No Cutoff) ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Ambient radial diffuse glow - 100% full bleed across ultra-wide monitors */}
        <div className="absolute top-0 left-0 right-0 w-full h-[850px] ambient-hero-glow" />

        {/* Dynamic decorative light flares */}
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl" />

        {/* Top horizon light beam below navbar */}
        <div className="absolute top-14 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 dark:via-blue-400/50 to-transparent" />
      </div>

      {/* ── Fixed Navbar ────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b border-zinc-200/80 dark:border-[#2e2e30]/80 bg-white/90 dark:bg-[#0f0f10]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-50 transition-colors shadow-xs">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-6">
          <LayaMeetLogo size="md" />

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-zinc-950 dark:hover:text-white transition-colors">{t.nav.features}</a>
            <a href="#pricing" className="hover:text-zinc-950 dark:hover:text-white transition-colors">{t.nav.pricing}</a>
            <a href="#faq" className="hover:text-zinc-950 dark:hover:text-white transition-colors">{t.nav.faq}</a>
            <Link to="/developers" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              {t.nav.developers}
            </Link>
            <a href="#contact" className="hover:text-zinc-950 dark:hover:text-white transition-colors">{t.nav.onPrem}</a>
          </nav>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Automatic + Manual Location Language Switcher */}
          <LanguageSwitcher />

          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Privacy & System Status */}
          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-white hover:bg-zinc-100 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] border border-zinc-200 dark:border-[#3a3a3d] px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Kiểm tra cấu hình và trạng thái hệ thống"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="hidden sm:inline">{t.nav.systemPrivacy}</span>
            <span className="sm:hidden">{t.nav.systemShort}</span>
          </button>

          {/* Language Matrix Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-500 bg-white dark:bg-[#1a1a1b] border border-zinc-200 dark:border-[#2e2e30] px-3 py-1.5 rounded-lg">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.nav.polyglotMatrix}</span>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 shrink-0" aria-hidden="true" />

      {/* ── Hero ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Top hero section: fluid full-width on large & ultra-wide screens */}
        <section id="hero" className="w-full max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16 pt-8 pb-12 md:pt-14 md:pb-18 lg:pt-16 lg:pb-20 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16 xl:gap-24">

          {/* Left: Headline + CTA */}
          <div className="flex-1 w-full lg:max-w-xl xl:max-w-2xl space-y-6 text-center lg:text-left">
            {/* Enterprise Security Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{t.hero.infraBadge}</span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">{t.hero.infraSub}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-[1.12]">
              {t.hero.titleLine1}
              <br />
              <span className="text-blue-600 dark:text-blue-400 font-black">{t.hero.titleHighlight}</span>
              {t.hero.titleEnd}
            </h1>

            <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base lg:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              {t.hero.description}
            </p>

            {/* Error */}
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-red-950/50 dark:bg-red-950/50 bg-red-50 border border-red-900/50 dark:border-red-900/50 border-red-200 text-red-400 dark:text-red-400 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={handleCreateNewMeeting}
                disabled={loading}
                className="w-full sm:w-auto whitespace-nowrap px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span>{loading ? t.hero.btnCreating : t.hero.btnCreate}</span>
              </button>

              {SHOW_ENTERPRISE_SSO && (
                <button
                  type="button"
                  onClick={() => setIsEnterpriseSsoOpen(true)}
                  className="w-full sm:w-auto whitespace-nowrap px-5 py-3 bg-white hover:bg-zinc-50 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] text-zinc-800 dark:text-zinc-100 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer border border-zinc-300 dark:border-[#3a3a3d] shadow-xs"
                >
                  <Building2 className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>{t.hero.btnEnterpriseSso}</span>
                </button>
              )}

              <form onSubmit={handleJoinWithCode} className="w-full sm:w-auto flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t.hero.inputRoomCode}
                  value={meetingCodeInput}
                  onChange={(e) => setMeetingCodeInput(e.target.value.toUpperCase())}
                  maxLength={8}
                  aria-label={t.hero.inputRoomCode}
                  className="bg-[#1a1a1b] dark:bg-[#1a1a1b] bg-white border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 text-zinc-100 dark:text-zinc-100 text-zinc-900 text-sm sm:text-base rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase font-mono tracking-widest w-full sm:w-48 transition placeholder-zinc-500 dark:placeholder-zinc-600 shadow-xs"
                />
                <button
                  type="submit"
                  className="shrink-0 p-3 rounded-xl bg-[#222224] hover:bg-[#2a2a2c] dark:bg-[#222224] dark:hover:bg-[#2a2a2c] bg-zinc-100 hover:bg-zinc-200 text-zinc-300 hover:text-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 text-zinc-700 hover:text-zinc-900 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 transition-colors cursor-pointer"
                  aria-label={t.hero.btnJoin}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Brand Proof Metrics */}
            <div className="pt-5 border-t border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <div className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-zinc-100 font-mono">{t.hero.metricZeroStorage}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.hero.metricZeroSub}</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">{t.hero.metricLatency}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.hero.metricLatencySub}</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{t.hero.metricOnPrem}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.hero.metricOnPremSub}</div>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Demo Studio Preview */}
          <div className="relative group shrink-0 w-full lg:w-auto flex justify-center">
            {/* Subtle glow backplate */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600/10 via-indigo-600/5 to-transparent rounded-3xl blur-xl pointer-events-none" />
            <InteractiveMeetingPreview />
          </div>
        </section>

        {/* ── Features grid with LayaMeet branding ──────────────────── */}
        <section id="features" className="border-t border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 bg-[#0f0f10] dark:bg-[#0f0f10] bg-white/50 transition-colors py-14 md:py-20 lg:py-24">
          <div className="max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 2xl:px-16">
            <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {t.features.sectionTitle}
              </h2>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                {t.features.sectionSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.features.items.map((item, idx) => {
                const Icon = FEATURES[idx]?.icon || FEATURES[0].icon;
                return (
                  <div
                    key={item.title}
                    className="bg-[#1a1a1b] dark:bg-[#1a1a1b] bg-white border border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 rounded-xl p-5 space-y-3 hover:border-[#3a3a3d] dark:hover:border-[#3a3a3d] hover:border-zinc-300 transition-colors shadow-xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#222224] dark:bg-[#222224] bg-zinc-100 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-200 flex items-center justify-center text-zinc-400 dark:text-zinc-400 text-zinc-700">
                      <Icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 dark:text-zinc-100 text-zinc-900">{item.title}</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 text-zinc-600 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing Section ─────────────────────────────────────── */}
        <PricingSection
          onContactClick={() => {
            document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* ── FAQ Section for Search Intent & Rich Snippets ───────── */}
        <FAQSection />

        {/* ── Contact & Enterprise Inquiry Section ────────────────── */}
        <ContactSection />
      </main>

      {/* ── Production Comprehensive Footer ─────────────────────── */}
      <Footer
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
        onOpenPrivacyModal={() => setLegalModalType('privacy')}
        onOpenTermsModal={() => setLegalModalType('terms')}
      />

      {/* System Status Modal */}
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
    </div>
  );
};
