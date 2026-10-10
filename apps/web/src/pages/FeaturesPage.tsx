import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Mic,
  Globe,
  FileText,
  ShieldCheck,
  Layers,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';
import { PublicPageShell } from '../components/common/PublicPageShell';
import { useLanguage } from '../context/language-context-def';
import { AppLanguage } from '../i18n';

interface FeaturesPageProps {
  forcedLanguage?: AppLanguage;
}

interface FeaturesPageCopy {
  breadcrumb: string;
  pageTitle: string;
  metaDesc: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaMeet: string;
  ctaPricing: string;
  specsTitle: string;
  specsDesc: string;
}

const FEATURES_PAGE_COPY: Record<string, FeaturesPageCopy> = {
  vi: {
    breadcrumb: 'Tính năng & Công nghệ',
    pageTitle: 'Tính Năng & Kiến Trúc Họp Song Ngữ AI | Laya Meet',
    metaDesc: 'Khám phá kiến trúc công nghệ họp trực tuyến song ngữ AI: Faster-Whisper int8 <350ms, WebRTC SFU LiveKit, bảo mật 100% RAM-Only và trích xuất Action Items.',
    heroBadge: 'Công Nghệ AI Tiên Tiến',
    heroTitle: 'Đột phá giao tiếp với AI dịch thuật thời gian thực',
    heroSubtitle: 'Trải nghiệm hội nghị truyền hình song ngữ độ trễ cực thấp. Xóa bỏ rào cản ngôn ngữ với phụ đề tự động hai chiều và bảo mật tuyệt đối.',
    ctaMeet: 'Bắt đầu cuộc họp miễn phí',
    ctaPricing: 'Xem bảng giá & các gói',
    specsTitle: 'Kiến Trúc Đa Tầng Cấp Doanh Nghiệp',
    specsDesc: 'Được thiết kế cho độ trễ âm thanh <350ms và độ tin cậy cấp viễn thông.',
  },
  en: {
    breadcrumb: 'Features & Architecture',
    pageTitle: 'AI Multilingual Features & Architecture | Laya Meet',
    metaDesc: 'Explore enterprise real-time AI bilingual meeting technology: Faster-Whisper int8 <350ms, LiveKit WebRTC SFU, 100% RAM-only zero raw audio storage.',
    heroBadge: 'Cutting-Edge AI Platform',
    heroTitle: 'Break language barriers with real-time AI translation',
    heroSubtitle: 'Ultra-low latency multilingual video conferencing with bidirectional subtitles, enterprise glossary support, and absolute privacy.',
    ctaMeet: 'Start Free Meeting Now',
    ctaPricing: 'View Pricing & Plans',
    specsTitle: 'Enterprise Multi-Tier Architecture',
    specsDesc: 'Engineered for sub-350ms audio latency and carrier-grade reliability.',
  },
  ja: {
    breadcrumb: '機能一覧 & アーキテクチャ',
    pageTitle: '機能一覧 & AIリアルタイム技術 | Laya Meet',
    metaDesc: 'Laya MeetのAI多言語会議アーキテクチャ：Faster-Whisper int8（遅延350ms未満）、LiveKit WebRTC SFU、完全RAMメモリ処理によるゼロ音声保存。',
    heroBadge: '最先端リアルタイムAI基盤',
    heroTitle: 'リアルタイムAI翻訳で、世界との距離をゼロに',
    heroSubtitle: '超低遅延双方向字幕、企業専用カスタム辞書、そして完全RAM-onlyセキュリティを備えた次世代オンライン会議システム。',
    ctaMeet: '今すぐ無料で会議を開始',
    ctaPricing: '料金プランを見る',
    specsTitle: 'エンタープライズ多層アーキテクチャ',
    specsDesc: '遅延350ms未満の音声認識と最高レベルの通信安定性を実現。',
  },
};

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ forcedLanguage }) => {
  const { language, t } = useLanguage();
  const currentLang = forcedLanguage || language;
  const copy = FEATURES_PAGE_COPY[currentLang] || FEATURES_PAGE_COPY.vi;

  useEffect(() => {
    document.title = copy.pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', copy.metaDesc);
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', 'https://layameet.com/features');
    }
  }, [copy]);

  const featureIcons = [Mic, Globe, FileText, ShieldCheck];

  return (
    <PublicPageShell
      forcedLanguage={forcedLanguage}
      activeDrawerId="features"
      breadcrumbs={[
        {
          label: copy.breadcrumb,
          current: true,
        },
      ]}
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
        {/* ── Hero Section ── */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{copy.heroBadge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-tight">
            {copy.heroTitle}
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            {copy.heroSubtitle}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>{copy.ctaMeet}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <span>{copy.ctaPricing}</span>
            </Link>
          </div>
        </section>

        {/* ── 4 Key Feature Cards ── */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {t.features.sectionTitle}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              {t.features.sectionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {t.features.items.map((item, idx) => {
              const Icon = featureIcons[idx] || Sparkles;
              return (
                <div
                  key={item.title}
                  className="bg-white dark:bg-[#14151a] border border-zinc-200/90 dark:border-[#22232a] rounded-2xl p-6 sm:p-7 space-y-3.5 shadow-xs hover:border-blue-500/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Enterprise Multi-Tier Architecture Section ── */}
        <section className="p-6 sm:p-10 rounded-3xl bg-zinc-100/70 dark:bg-[#131418] border border-zinc-200 dark:border-[#262730] space-y-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
              <span>{copy.specsTitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white">
              Hạ tầng truyền thông & Trí tuệ nhân tạo chuyên sâu
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
              {copy.specsDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#191a21] border border-zinc-200/80 dark:border-[#2b2d38] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>WebRTC SFU LiveKit</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Máy chủ WebRTC SFU hiệu năng cao với cơ chế khóa tuần tự RTCPeerConnection tránh xung đột renegotiation.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Audio Latency &lt; 150ms</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#191a21] border border-zinc-200/80 dark:border-[#2b2d38] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white">
                <Cpu className="w-4 h-4 text-blue-500" />
                <span>Faster-Whisper int8 + VAD</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Audio chunking 350ms, Voice Activity Detection lọc tạp âm và Whisper int8 tăng tốc phần cứng CPU.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>TTFS ~964ms</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#191a21] border border-zinc-200/80 dark:border-[#2b2d38] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-zinc-950 dark:text-white">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>100% RAM-Only Security</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Không ghi âm thanh raw xuống ổ cứng hay database. Tự động giải phóng bộ nhớ khi phiên họp kết thúc.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero File Storage</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
};

export default FeaturesPage;
