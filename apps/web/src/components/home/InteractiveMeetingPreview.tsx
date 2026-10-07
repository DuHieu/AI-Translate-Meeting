import React, { useState, useEffect } from 'react';
import { Mic, Globe, Zap, CheckCircle2, Play, Pause, X } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';

// Razor-sharp inline SVG flags
const FlagJP: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[2px] inline-block shrink-0 shadow-xs border border-zinc-700/50`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#ffffff" />
    <circle cx="450" cy="300" r="180" fill="#bc002d" />
  </svg>
);

const FlagVN: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[2px] inline-block shrink-0 shadow-xs border border-zinc-700/50`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#da251d" />
    <polygon points="450,150 491,277 625,277 516,356 558,483 450,404 342,483 384,356 275,277 409,277" fill="#ffff00" />
  </svg>
);

const FlagUS: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[2px] inline-block shrink-0 shadow-xs border border-zinc-700/50`} viewBox="0 0 741 390">
    <rect width="741" height="390" fill="#B22234" />
    <path d="M0,30H741M0,90H741M0,150H741M0,210H741M0,270H741M0,330H741" stroke="#fff" strokeWidth="30" />
    <rect width="296" height="210" fill="#3C3B6E" />
    <circle cx="148" cy="105" r="70" fill="#ffffff" opacity="0.3" />
  </svg>
);

type TargetLanguage = 'VI' | 'EN' | 'JA';

interface DialogueTurn {
  id: string;
  speaker: string;
  shortName: string;
  role: string;
  avatarInitials: string;
  avatarBg: string;
  flagComponent: React.FC<{ className?: string }>;
  sourceLang: string;
  sourceText: string;
  translations: Record<TargetLanguage, string>;
  actionItem?: {
    text: Record<TargetLanguage, string>;
    confidence: string;
  };
  latencyMs: number;
}

const DIALOGUE_SCRIPT: DialogueTurn[] = [
  {
    id: 'turn-1',
    speaker: 'Kenji Sato',
    shortName: 'Kenji S.',
    role: 'Tokyo',
    avatarInitials: 'KS',
    avatarBg: 'from-violet-600 to-indigo-700',
    flagComponent: FlagJP,
    sourceLang: 'JA',
    sourceText: '来週のリリースに向けて、多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
    translations: {
      VI: 'Trước đợt phát hành tuần tới, chúng tôi đã tối ưu độ trễ dịch đa ngữ thời gian thực xuống dưới 350ms.',
      EN: 'Ahead of next week\'s release, we have optimized multi-language real-time translation latency to under 350ms.',
      JA: '来週のリリースに向けて、多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
    },
    actionItem: {
      text: {
        VI: 'Xác nhận benchmark STT đa ngữ <350ms trên cụm Staging',
        EN: 'Verify multilingual STT benchmark <350ms on Staging cluster',
        JA: 'Staging環境で多言語STTベンチマーク（<350ms）を検証',
      },
      confidence: '98%',
    },
    latencyMs: 312,
  },
  {
    id: 'turn-2',
    speaker: 'David Miller',
    shortName: 'David M.',
    role: 'San Francisco',
    avatarInitials: 'DM',
    avatarBg: 'from-emerald-600 to-teal-700',
    flagComponent: FlagUS,
    sourceLang: 'EN',
    sourceText: 'All global participants are receiving seamless local subtitles in their own language without any lag.',
    translations: {
      VI: 'Tất cả thành viên toàn cầu đều nhận được phụ đề song ngữ theo ngôn ngữ riêng mà không bị gián đoạn.',
      EN: 'All global participants are receiving seamless local subtitles in their own language without any lag.',
      JA: '世界中の全参加者が、遅延なく各自の母国語でリアルタイム字幕を受信できています。',
    },
    actionItem: {
      text: {
        VI: 'Thử nghiệm phòng họp 10 quốc gia đồng thời vào thứ Năm',
        EN: 'Scale test 10 concurrent country regions this Thursday',
        JA: '木曜日に10か国同時接続での会議室ストレステストを実施',
      },
      confidence: '96%',
    },
    latencyMs: 295,
  },
  {
    id: 'turn-3',
    speaker: 'Minh Nguyen',
    shortName: 'Minh N.',
    role: 'Đà Nẵng',
    avatarInitials: 'MN',
    avatarBg: 'from-blue-600 to-cyan-700',
    flagComponent: FlagVN,
    sourceLang: 'VI',
    sourceText: 'Phía Việt Nam đã sẵn sàng. Hệ thống Laya AI đang trích xuất Action Items đồng thời cho mọi ngôn ngữ.',
    translations: {
      VI: 'Phía Việt Nam đã sẵn sàng. Hệ thống Laya AI đang trích xuất Action Items đồng thời cho mọi ngôn ngữ.',
      EN: 'The Vietnam team is ready. The Laya AI engine is concurrently extracting Action Items across all languages.',
      JA: 'ベトナム側も準備完了です。Laya AIが全言語向けにアクションアイテムをリアルタイム抽出しています。',
    },
    actionItem: {
      text: {
        VI: 'Xuất biên bản họp đa ngữ tự động sang Markdown cho dự án',
        EN: 'Export multilingual smart meeting minutes to Markdown for project team',
        JA: '多言語AI議事録をMarkdownで自動出力しプロジェクトへ共有',
      },
      confidence: '95%',
    },
    latencyMs: 284,
  },
];

interface InteractiveMeetingPreviewProps {
  onClose?: () => void;
}

export const InteractiveMeetingPreview: React.FC<InteractiveMeetingPreviewProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<TargetLanguage>(() => {
    if (language === 'en') return 'EN';
    if (language === 'ja') return 'JA';
    return 'VI';
  });
  const [isPlaying, setIsPlaying] = useState(true);

  // Sync target subtitle preview with site language
  useEffect(() => {
    if (language === 'en') setSelectedLang('EN');
    else if (language === 'ja') setSelectedLang('JA');
    else if (language === 'vi') setSelectedLang('VI');
  }, [language]);

  // Auto-cycle dialogue turns every 6 seconds
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTurnIndex((prev) => (prev + 1) % DIALOGUE_SCRIPT.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentTurn = DIALOGUE_SCRIPT[currentTurnIndex];
  const otherParticipants = DIALOGUE_SCRIPT.filter((_, idx) => idx !== currentTurnIndex);
  const translatedText = currentTurn.translations[selectedLang] || currentTurn.translations.VI;

  const tLabels = {
    vi: {
      title: 'Mô Phỏng Họp Song Ngữ AI',
      speaking: 'Nói',
      subLive: 'Dịch AI tức thì',
      actionTitle: 'Action Item',
      closeTip: 'Đóng bản xem trước (Tải lại trang để mở lại)',
      playTip: 'Phát tự động',
      pauseTip: 'Tạm dừng',
    },
    en: {
      title: 'Live Bilingual Meeting Demo',
      speaking: 'Speaking',
      subLive: 'Live AI Subtitles',
      actionTitle: 'Action Item',
      closeTip: 'Close preview (Reload page to restore)',
      playTip: 'Play',
      pauseTip: 'Pause',
    },
    ja: {
      title: 'リアルタイム多言語会議デモ',
      speaking: '発言中',
      subLive: 'AIリアルタイム字幕',
      actionTitle: 'TODO / 決定事項',
      closeTip: 'プレビューを閉じる（リロードで再表示）',
      playTip: '再生',
      pauseTip: '一時停止',
    },
  }[language] || {
    title: 'Live Bilingual Meeting Demo',
    speaking: 'Speaking',
    subLive: 'Live AI Subtitles',
    actionTitle: 'Action Item',
    closeTip: 'Close preview (Reload page to restore)',
    playTip: 'Play',
    pauseTip: 'Pause',
  };

  return (
    <div className="w-full sm:w-[500px] lg:w-[540px] xl:w-[580px] bg-zinc-900 border border-zinc-700/60 dark:border-[#33353e] rounded-2xl overflow-hidden shrink-0 shadow-2xl transition-all">
      {/* ── Studio Top Chrome Bar (Clean Mac-style with working close button) ── */}
      <div className="px-3.5 py-2.5 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {/* Mac-style subtle window controls — Red dot closes the frame */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              data-testid="preview-red-dot"
              title={tLabels.closeTip}
              aria-label={tLabels.closeTip}
              className="w-2.5 h-2.5 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer transition-colors"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] font-mono text-zinc-400 pl-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-zinc-200">{tLabels.title}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? tLabels.pauseTip : tLabels.playTip}
            aria-label={isPlaying ? tLabels.pauseTip : tLabels.playTip}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-blue-400" />}
          </button>

          {/* Close button [✕] for explicit discovery */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              data-testid="preview-close-btn"
              title={tLabels.closeTip}
              aria-label={tLabels.closeTip}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Realistic Video Conference Canvas ─────────────────────── */}
      <div className="relative aspect-[16/10] bg-gradient-to-b from-[#181922] to-[#0c0d12] flex flex-col justify-between p-3.5 overflow-hidden">
        {/* Subtle ambient audio reaction wave in background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
          <div className="w-48 h-48 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        </div>

        {/* Top Floating Row: Action Item Toast (Left) & Secondary PIP Thumbnails (Right) */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          {/* Compact Action Item pill (Clean, non-intrusive) */}
          {currentTurn.actionItem ? (
            <div className="max-w-[65%] px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-md text-[10px] text-zinc-200 flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate font-medium">
                {currentTurn.actionItem.text[selectedLang] || currentTurn.actionItem.text.VI}
              </span>
            </div>
          ) : <div />}

          {/* Secondary PIP Attendee Tiles */}
          <div className="flex items-center gap-1.5 shrink-0">
            {otherParticipants.map((p) => {
              const Flag = p.flagComponent;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const idx = DIALOGUE_SCRIPT.findIndex((d) => d.id === p.id);
                    if (idx !== -1) setCurrentTurnIndex(idx);
                  }}
                  className="px-2 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/60 backdrop-blur-md flex items-center gap-1.5 text-[10px] text-zinc-300 transition-all cursor-pointer shadow-sm"
                  title={`${p.speaker} (${p.role})`}
                >
                  <span className="font-semibold">{p.shortName}</span>
                  <Flag />
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Active Speaker Representation with Speech Pulse */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          {/* Animated Avatar */}
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-blue-500/25 blur-sm animate-pulse" />
            <div className={`relative w-16 h-16 rounded-full bg-gradient-to-tr ${currentTurn.avatarBg} text-white font-bold text-lg flex items-center justify-center shadow-lg ring-2 ring-white/20`}>
              {currentTurn.avatarInitials}
            </div>
            {/* Live Speaking Indicator */}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-zinc-900 flex items-center justify-center text-white">
              <Mic className="w-2.5 h-2.5" />
            </span>
          </div>

          {/* Speaker Name Tag Badge */}
          <div className="mt-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold flex items-center gap-1.5">
            <span>{currentTurn.speaker}</span>
            <currentTurn.flagComponent />
            <span className="text-[10px] text-zinc-400 font-normal">({currentTurn.role})</span>
          </div>
        </div>

        {/* Bottom: Crystal Clear Bilingual Closed Caption Overlay (Google Meet Style) */}
        <div className="relative z-10 w-full rounded-xl bg-black/85 backdrop-blur-md border border-white/10 p-3 shadow-xl space-y-1">
          {/* Original Speech Line (subtle font-mono) */}
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-1 truncate">
              <span className="font-medium text-zinc-300">{currentTurn.shortName}</span>
              <span>({currentTurn.sourceLang}):</span>
              <span className="italic truncate max-w-[260px] sm:max-w-[340px]">{currentTurn.sourceText}</span>
            </span>
            <span className="font-mono text-emerald-400 shrink-0 text-[9px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{currentTurn.latencyMs}ms</span>
            </span>
          </div>

          {/* Real-time Subtitle Translation (High contrast, bold, immediate) */}
          <div className="flex items-start gap-1.5 pt-0.5">
            <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-bold text-white tracking-wide leading-snug">
              {translatedText}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom Control Strip: Clean Speaker Switcher & Target Language Toggle ── */}
      <div className="px-3.5 py-2 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-1 text-[11px]">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline text-zinc-300 font-medium">{tLabels.subLive}:</span>
        </div>

        {/* Minimal 3-Language Selector Pills */}
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
          {(['VI', 'EN', 'JA'] as TargetLanguage[]).map((lang) => {
            const isSelected = selectedLang === lang;
            const flags = { VI: FlagVN, EN: FlagUS, JA: FlagJP };
            const Flag = flags[lang];
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Flag />
                <span>{lang}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
