import React, { useState, useEffect } from 'react';
import { Mic, Play, Pause, X, Check, Volume2 } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';

const FlagJP: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[1px] inline-block shrink-0 border border-slate-400/50`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#ffffff" />
    <circle cx="450" cy="300" r="180" fill="#bc002d" />
  </svg>
);

const FlagVN: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[1px] inline-block shrink-0 border border-slate-400/50`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#da251d" />
    <polygon points="450,150 491,277 625,277 516,356 558,483 450,404 342,483 384,356 275,277 409,277" fill="#ffff00" />
  </svg>
);

const FlagUS: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[1px] inline-block shrink-0 border border-slate-400/50`} viewBox="0 0 741 390">
    <rect width="741" height="390" fill="#B22234" />
    <path d="M0,30H741M0,90H741M0,150H741M0,210H741M0,270H741M0,330H741" stroke="#fff" strokeWidth="30" />
    <rect width="296" height="210" fill="#3C3B6E" />
  </svg>
);

type TargetLanguage = 'VI' | 'EN' | 'JA';

interface DialogueTurn {
  id: string;
  speaker: string;
  shortName: string;
  role: string;
  avatarInitials: string;
  flagComponent: React.FC<{ className?: string }>;
  sourceLang: string;
  sourceText: string;
  translations: Record<TargetLanguage, string>;
  actionItem?: {
    text: Record<TargetLanguage, string>;
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
    flagComponent: FlagJP,
    sourceLang: 'JA',
    sourceText: '多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
    translations: {
      VI: 'Chúng tôi đã tối ưu độ trễ dịch đa ngữ thời gian thực xuống dưới 350ms.',
      EN: 'We optimized multi-language real-time translation latency to under 350ms.',
      JA: '多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
    },
    actionItem: {
      text: {
        VI: 'Action: Xác nhận benchmark <350ms trên Staging',
        EN: 'Action: Verify <350ms benchmark on Staging',
        JA: '決定: Staging環境で<350msを検証',
      },
    },
    latencyMs: 118,
  },
  {
    id: 'turn-2',
    speaker: 'David Miller',
    shortName: 'David M.',
    role: 'San Francisco',
    avatarInitials: 'DM',
    flagComponent: FlagUS,
    sourceLang: 'EN',
    sourceText: 'All participants receive live bilingual captions and voice dubbing.',
    translations: {
      VI: 'Tất cả thành viên đều nhận được phụ đề song ngữ và thuyết minh giọng nói.',
      EN: 'All participants receive live bilingual captions and voice dubbing.',
      JA: '全参加者がリアルタイム二言語字幕と音声通訳を受信できます。',
    },
    actionItem: {
      text: {
        VI: 'Action: Kiểm thử 10 phòng họp đồng thời thứ Năm',
        EN: 'Action: Run 10-room load test on Thursday',
        JA: '決定: 木曜日に10会議室テストを実施',
      },
    },
    latencyMs: 94,
  },
  {
    id: 'turn-3',
    speaker: 'Minh Nguyen',
    shortName: 'Minh N.',
    role: 'Đà Nẵng',
    avatarInitials: 'MN',
    flagComponent: FlagVN,
    sourceLang: 'VI',
    sourceText: 'Âm thanh xử lý 100% trên RAM và tự động xuất biên bản sau cuộc họp.',
    translations: {
      VI: 'Âm thanh xử lý 100% trên RAM và tự động xuất biên bản sau cuộc họp.',
      EN: 'Audio is processed 100% in RAM with automated minutes after the call.',
      JA: '音声は100%メモリ処理され、会議後に議事録が自動生成されます。',
    },
    actionItem: {
      text: {
        VI: 'Action: Xuất biên bản Markdown gửi khách hàng',
        EN: 'Action: Export Markdown minutes for client',
        JA: '決定: 議事録をMarkdownで出力',
      },
    },
    latencyMs: 86,
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

  useEffect(() => {
    if (language === 'en') setSelectedLang('EN');
    else if (language === 'ja') setSelectedLang('JA');
    else if (language === 'vi') setSelectedLang('VI');
  }, [language]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTurnIndex((prev) => (prev + 1) % DIALOGUE_SCRIPT.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentTurn = DIALOGUE_SCRIPT[currentTurnIndex];
  const translatedText = currentTurn.translations[selectedLang] || currentTurn.translations.VI;

  return (
    <div className="w-full bg-[#DCE2EA] dark:bg-[#1A202C] border border-slate-300 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-md flex flex-col justify-between select-none">
      {/* ── Compact Window Header ── */}
      <div className="h-9 px-3.5 bg-[#CFD6E0] dark:bg-[#141923] border-b border-slate-300 dark:border-slate-700/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              data-testid="preview-red-dot"
              aria-label="Close"
              className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 hover:bg-rose-500 cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 truncate ml-1">
            MEET-Q4-SYNC
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-600/30 tabular-nums">
            {currentTurn.latencyMs}ms
          </span>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              data-testid="preview-close-btn"
              aria-label="Close"
              className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Low-Glare Conference Workspace ── */}
      <div className="p-4 bg-[#D3DAE3] dark:bg-[#12161F] space-y-3.5">
        {/* 3 Compact Participant Tiles */}
        <div className="grid grid-cols-3 gap-2.5">
          {DIALOGUE_SCRIPT.map((p, idx) => {
            const isSpeaking = idx === currentTurnIndex;
            const Flag = p.flagComponent;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCurrentTurnIndex(idx)}
                className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between h-20 ${
                  isSpeaking
                    ? 'bg-[#E8ECF2] dark:bg-[#1E2634] border-[#0F766E] dark:border-teal-500'
                    : 'bg-[#DCE2EA]/80 dark:bg-[#171C26] border-slate-300 dark:border-slate-800 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-6 h-6 rounded bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold flex items-center justify-center">
                    {p.avatarInitials}
                  </div>
                  {isSpeaking ? (
                    <Mic className="w-3 h-3 text-[#0F766E] dark:text-teal-400" />
                  ) : (
                    <Flag />
                  )}
                </div>

                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                  <span>{p.shortName}</span>
                  {isSpeaking && <Flag />}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Live Bilingual Subtitle Box ── */}
        <div className="rounded-lg bg-[#E6EBF1] dark:bg-[#1A212D] border border-slate-300 dark:border-slate-700/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {currentTurn.shortName} ({currentTurn.sourceLang})
            </span>
            <span className="font-mono text-[10px] text-[#0F766E] dark:text-teal-400 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {currentTurn.sourceLang} → {selectedLang}
            </span>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
            {currentTurn.sourceText}
          </div>

          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug pt-0.5">
            {translatedText}
          </div>

          {currentTurn.actionItem && (
            <div className="pt-2 border-t border-slate-300/80 dark:border-slate-700/70 flex items-center gap-1.5 text-[11px] text-[#0F766E] dark:text-teal-400 font-medium truncate">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {currentTurn.actionItem.text[selectedLang] || currentTurn.actionItem.text.VI}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Language Selector ── */}
      <div className="px-3.5 py-2 bg-[#CFD6E0] dark:bg-[#141923] border-t border-slate-300 dark:border-slate-700/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Subtitles:</span>

        <div className="flex items-center gap-1 bg-[#DCE2EA] dark:bg-[#1A202C] p-0.5 rounded border border-slate-300 dark:border-slate-700">
          {(['VI', 'EN', 'JA'] as TargetLanguage[]).map((lang) => {
            const isSelected = selectedLang === lang;
            const flags = { VI: FlagVN, EN: FlagUS, JA: FlagJP };
            const Flag = flags[lang];
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F766E] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
