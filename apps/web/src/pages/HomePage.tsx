import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { meetingApi } from '../api/meetingApi';
import { Plus, ArrowRight, ShieldCheck, Globe, Mic, FileText, Building2 } from 'lucide-react';
import { admissionStorage } from '../utils/admissionStorage';
import { SystemStatusModal } from '../components/system/SystemStatusModal';
import { ViMeetLogo } from '../components/common/ViMeetLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { InteractiveMeetingPreview } from '../components/home/InteractiveMeetingPreview';
import { PricingSection } from '../components/home/PricingSection';
import { FAQSection } from '../components/home/FAQSection';
import { ContactSection } from '../components/home/ContactSection';
import { Footer } from '../components/common/Footer';
import { LegalModal } from '../components/common/LegalModal';
import { EnterpriseSsoModal } from '../components/home/EnterpriseSsoModal';

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
  const navigate = useNavigate();
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
      const res = await meetingApi.createMeeting('ViMeet');
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
      {/* ── Background Atmospheric Light & Engineering Mesh Layers ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Ambient radial diffuse glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[680px] ambient-hero-glow" />

        {/* Precision engineering line mesh with radial fade mask */}
        <div className="absolute inset-0 bg-grid-mesh mask-radial-faded opacity-85 dark:opacity-75" />

        {/* Top horizon light beam below navbar */}
        <div className="absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 dark:via-blue-500/40 to-transparent" />
      </div>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className="h-12 border-b border-[#2e2e30]/80 dark:border-[#2e2e30] border-zinc-200 bg-[#0f0f10]/85 dark:bg-[#0f0f10]/85 bg-white/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-6">
          <ViMeetLogo size="md" showBadge={true} />

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Tính Năng</a>
            <a href="#pricing" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Bảng Giá</a>
            <a href="#faq" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Hỏi Đáp</a>
            <Link to="/developers" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
              Nhà Phát Triển
            </Link>
            <a href="#contact" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Tư Vấn On-Prem</a>
          </nav>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Light / Dark Mode Toggle */}
          <ThemeToggle />

          {/* Privacy & System Status */}
          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 text-zinc-600 hover:text-zinc-900 bg-[#1a1a1b] hover:bg-[#222224] dark:bg-[#1a1a1b] dark:hover:bg-[#222224] bg-white hover:bg-zinc-100 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-200 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Kiểm tra cấu hình và trạng thái hệ thống"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="hidden sm:inline">Hệ thống &amp; Quyền riêng tư</span>
            <span className="sm:hidden">Hệ thống</span>
          </button>

          {/* Language Matrix Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500 text-zinc-600 bg-[#1a1a1b] dark:bg-[#1a1a1b] bg-white border border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 px-3 py-1.5 rounded-lg">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>50+ Ngôn Ngữ (Any-to-Any)</span>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col">
        {/* Top hero section */}
        <section id="hero" className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-10 pb-8 md:pt-16 md:pb-14 flex flex-col md:flex-row items-center gap-8 md:gap-12">

          {/* Left: Headline + CTA */}
          <div className="flex-1 max-w-lg space-y-5 text-center md:text-left">
            {/* ViMeet Brand Badge Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-xs">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>ViMeet AI 2.0</span>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">Họp Đa Ngôn Ngữ Toàn Cầu &amp; On-Premise</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 dark:text-white tracking-tight leading-[1.18]">
              Họp đa ngôn ngữ cùng{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-sky-300 dark:to-indigo-300 bg-clip-text text-transparent">
                ViMeet
              </span>
              <br />
              <span className="text-blue-600 dark:text-blue-400">thời gian thực,</span> bảo mật tuyệt đối.
            </h1>

            <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">ViMeet</strong> không cố định theo cặp ngôn ngữ: dù trong phòng họp có người Việt, Nhật, Mỹ, Trung, Thái, Lào... mỗi người đều tự do nói tiếng mẹ đẻ và đọc phụ đề theo đúng ngôn ngữ mình chọn — xử lý On-Premise bảo mật tuyệt đối.
            </p>

            {/* Error */}
            {error && (
              <div role="alert" className="p-3 rounded-lg bg-red-950/50 dark:bg-red-950/50 bg-red-50 border border-red-900/50 dark:border-red-900/50 border-red-200 text-red-400 dark:text-red-400 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCreateNewMeeting}
                disabled={loading}
                className="w-full sm:w-auto whitespace-nowrap px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{loading ? 'Đang tạo...' : 'Tạo cuộc họp mới'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEnterpriseSsoOpen(true)}
                className="w-full sm:w-auto whitespace-nowrap px-4 py-2.5 bg-white hover:bg-zinc-50 dark:bg-[#1a1a1b] dark:hover:bg-[#222224] text-zinc-800 dark:text-zinc-100 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer border border-zinc-300 dark:border-[#3a3a3d] shadow-xs"
              >
                <Building2 className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Enterprise SSO</span>
              </button>

              <form onSubmit={handleJoinWithCode} className="w-full sm:w-auto flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã phòng"
                  value={meetingCodeInput}
                  onChange={(e) => setMeetingCodeInput(e.target.value.toUpperCase())}
                  maxLength={8}
                  aria-label="Mã phòng họp"
                  className="bg-[#1a1a1b] dark:bg-[#1a1a1b] bg-white border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 text-zinc-100 dark:text-zinc-100 text-zinc-900 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 uppercase font-mono tracking-widest w-full sm:w-44 transition placeholder-zinc-500 dark:placeholder-zinc-600 shadow-xs"
                />
                <button
                  type="submit"
                  className="shrink-0 p-2.5 rounded-lg bg-[#222224] hover:bg-[#2a2a2c] dark:bg-[#222224] dark:hover:bg-[#2a2a2c] bg-zinc-100 hover:bg-zinc-200 text-zinc-300 hover:text-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-100 text-zinc-700 hover:text-zinc-900 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-300 transition-colors cursor-pointer"
                  aria-label="Vào phòng họp"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Brand Proof Metrics */}
            <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 grid grid-cols-3 gap-3 text-left">
              <div>
                <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">0ms</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Lưu file (RAM-only)</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">&lt;350ms</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Độ trễ dịch đa ngữ</div>
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">100%</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">On-Premise VPS</div>
              </div>
            </div>
          </div>

          {/* Right: Live Interactive Demo Studio Preview with ambient halo */}
          <div className="relative group shrink-0 w-full md:w-auto flex justify-center">
            {/* Ambient aura glow behind the studio card */}
            <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600/20 via-indigo-600/15 to-violet-600/20 dark:from-blue-500/30 dark:via-indigo-500/20 dark:to-violet-500/25 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <InteractiveMeetingPreview />
          </div>
        </section>

        {/* ── Features grid with ViMeet branding ──────────────────── */}
        <section id="features" className="border-t border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 bg-[#0f0f10] dark:bg-[#0f0f10] bg-white/50 transition-colors py-10 md:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Vì sao doanh nghiệp tin chọn <span className="text-blue-600 dark:text-blue-400">ViMeet</span>?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Họp đa quốc gia không rào cản — tự do phát biểu tiếng mẹ đẻ và nhận phụ đề đa chiều theo ngôn ngữ của từng người tham gia.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="bg-[#1a1a1b] dark:bg-[#1a1a1b] bg-white border border-[#2e2e30] dark:border-[#2e2e30] border-zinc-200 rounded-xl p-4 space-y-2.5 hover:border-[#3a3a3d] dark:hover:border-[#3a3a3d] hover:border-zinc-300 transition-colors shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#222224] dark:bg-[#222224] bg-zinc-100 border border-[#3a3a3d] dark:border-[#3a3a3d] border-zinc-200 flex items-center justify-center text-zinc-400 dark:text-zinc-400 text-zinc-700">
                      <Icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100 dark:text-zinc-100 text-zinc-900">{f.title}</h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 text-zinc-600 leading-relaxed">{f.desc}</p>
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

      <EnterpriseSsoModal
        isOpen={isEnterpriseSsoOpen}
        onClose={() => setIsEnterpriseSsoOpen(false)}
      />

      {/* Legal & Terms Modal */}
      <LegalModal
        isOpen={legalModalType !== null}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
};
