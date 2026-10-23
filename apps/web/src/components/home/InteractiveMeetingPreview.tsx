import React, { useState, useEffect } from 'react';
import { Mic, Play, Pause, X, Check, Volume2 } from 'lucide-react';
import { useLanguage } from '../../context/language-context-def';

const FlagJP: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[1px] inline-block shrink-0 border border-zinc-700/60`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#ffffff" />
    <circle cx="450" cy="300" r="180" fill="#bc002d" />
  </svg>
);

const FlagVN: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[1px] inline-block shrink-0 border border-zinc-700/60`} viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#da251d" />
    <polygon points="450,150 491,277 625,277 516,356 558,483 450,404 342,483 384,356 275,277 409,277" fill="#ffff00" />
  </svg>
);

const FlagUS: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-2.5' }) => (
  <svg className={`${className} rounded-[1px] inline-block shrink-0 border border-zinc-700/60`} viewBox="0 0 741 390">
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
    role: 'Tokyo · Product Lead',
    avatarInitials: 'KS',
    flagComponent: FlagJP,
    sourceLang: 'JA',
    sourceText: '来週のリリースに向けて、多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
    translations: {
      VI: 'Trước đợt phát hành tuần tới, chúng tôi đã tối ưu độ trễ dịch đa ngữ thời gian thực xuống dưới 350ms.',
      EN: "Ahead of next week's release, we have optimized multi-language real-time translation latency to under 350ms.",
      JA: '来週のリリースに向けて、多言語リアルタイム翻訳の遅延を350ms以下に最適化しました。',
    },
    actionItem: {
      text: {
        VI: 'Action: Xác nhận benchmark STT đa ngữ <350ms trên Staging',
        EN: 'Action: Verify multilingual STT benchmark <350ms on Staging',
        JA: '課題: Staging環境で多言語STTベンチマーク（<350ms）を検証',
      },
    },
    latencyMs: 118,
  },
  {
    id: 'turn-2',
    speaker: 'David Miller',
    shortName: 'David M.',
    role: 'San Francisco · Infra',
    avatarInitials: 'DM',
    flagComponent: FlagUS,
    sourceLang: 'EN',
    sourceText: 'All participants receive direct bilingual captions from system audio without inviting any meeting bots.',
    translations: {
      VI: 'Tất cả thành viên đều nhận được phụ đề song ngữ trực tiếp từ âm thanh hệ thống mà không cần mời bot vào phòng.',
      EN: 'All participants receive direct bilingual captions from system audio without inviting any meeting bots.',
      JA: '会議ボットを招待することなく、システム音声から直接リアルタイム二言語字幕を受信できます。',
    },
    actionItem: {
      text: {
        VI: 'Action: Kiểm thử tải 10 phòng họp đồng thời vào thứ Năm',
        EN: 'Action: Run 10-room concurrent stress test this Thursday',
        JA: '課題: 木曜日に10会議室同時接続の負荷テストを実施',
      },
    },
    latencyMs: 94,
  },
  {
    id: 'turn-3',
    speaker: 'Minh Nguyen',
    shortName: 'Minh N.',
    role: 'Đà Nẵng · Engineering',
    avatarInitials: 'MN',
    flagComponent: FlagVN,
    sourceLang: 'VI',
    sourceText: 'Phía Việt Nam đã sẵn sàng. Luồng âm thanh xử lý hoàn toàn trên RAM và tự động tổng hợp biên bản sau cuộc họp.',
    translations: {
      VI: 'Phía Việt Nam đã sẵn sàng. Luồng âm thanh xử lý hoàn toàn trên RAM và tự động tổng hợp biên bản sau cuộc họp.',
      EN: 'Vietnam team is ready. Audio streams are processed 100% in RAM and meeting minutes are compiled automatically.',
      JA: 'ベトナム側も準備完了です。音声は100%メモリ上で処理され、会議後に議事録が自動生成されます。',
    },
    actionItem: {
      text: {
        VI: 'Action: Xuất biên bản họp sang Markdown gửi khách hàng',
        EN: 'Action: Export meeting minutes to Markdown for client review',
        JA: '課題: 議事録をMarkdown形式で出力しクライアントへ共有',
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

  const PREVIEW_COPY: Record<
    string,
    {
      windowTitle: string;
      overlayLabel: string;
      targetLangLabel: string;
      closeTip: string;
      playTip: string;
      pauseTip: string;
    }
  > = {
    vi: {
      windowTitle: 'Zoom Meeting — Q4 Architecture Sync',
      overlayLabel: 'LayaMeet Overlay · Click-Through',
      targetLangLabel: 'Dịch sang',
      closeTip: 'Đóng bản xem trước',
      playTip: 'Tiếp tục mô phỏng',
      pauseTip: 'Tạm dừng',
    },
    en: {
      windowTitle: 'Zoom Meeting — Q4 Architecture Sync',
      overlayLabel: 'LayaMeet Overlay · Click-Through',
      targetLangLabel: 'Translate to',
      closeTip: 'Close preview',
      playTip: 'Resume simulation',
      pauseTip: 'Pause',
    },
    ja: {
      windowTitle: 'Zoom ミーティング — Q4 アーキテクチャ定例',
      overlayLabel: 'LayaMeet オーバーレイ · 最前面透過',
      targetLangLabel: '翻訳先',
      closeTip: 'プレビューを閉じる',
      playTip: '再生',
      pauseTip: '一時停止',
    },
  };

  const tLabels = PREVIEW_COPY[language] || PREVIEW_COPY.vi;

  return (
    <div className="w-full bg-[#121316] border border-[#262930] rounded-lg overflow-hidden shadow-2xl text-zinc-100 select-none">
      {/* ── Native Windows 11 Title Bar ── */}
      <div className="h-9 px-3 bg-[#181A1F] border-b border-[#262930] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              data-testid="preview-red-dot"
              title={tLabels.closeTip}
              aria-label={tLabels.closeTip}
              className="w-2.5 h-2.5 rounded-full bg-zinc-600 hover:bg-red-500 transition-colors cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          </div>
          <span className="text-[11px] font-medium text-zinc-300 truncate">{tLabels.windowTitle}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-[#121316] border border-[#262930] tabular-nums">
            WASAPI · {currentTurn.latencyMs}ms
          </span>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? tLabels.pauseTip : tLabels.playTip}
            aria-label={isPlaying ? tLabels.pauseTip : tLabels.playTip}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              data-testid="preview-close-btn"
              title={tLabels.closeTip}
              aria-label={tLabels.closeTip}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Simulated Conference Grid + Floating Overlay Bar ── */}
      <div className="p-4 sm:p-5 bg-[#0E1013] space-y-4">
        {/* Participant Strip (3 Realistic Video Tiles) */}
        <div className="grid grid-cols-3 gap-2.5">
          {DIALOGUE_SCRIPT.map((p, idx) => {
            const isSpeaking = idx === currentTurnIndex;
            const Flag = p.flagComponent;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCurrentTurnIndex(idx)}
                className={`text-left p-3 rounded-md border transition-colors cursor-pointer flex flex-col justify-between h-24 sm:h-28 ${
                  isSpeaking
                    ? 'bg-[#171A21] border-blue-500/80'
                    : 'bg-[#14161B] border-[#22252C] hover:border-zinc-700 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded bg-[#232730] border border-zinc-700/60 text-zinc-200 font-mono text-[11px] font-semibold flex items-center justify-center">
                    {p.avatarInitials}
                  </div>
                  {isSpeaking ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                      <Mic className="w-2.5 h-2.5" />
                      LIVE
                    </span>
                  ) : (
                    <Flag />
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-100 truncate flex items-center gap-1.5">
                    <span>{p.shortName}</span>
                    {isSpeaking && <Flag />}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{p.role}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── THE ACTUAL PRODUCT: LayaMeet Floating Translucent Overlay ── */}
        <div className="rounded-lg bg-[#16181E] border border-[#2D313B] p-3.5 sm:p-4 shadow-xl space-y-2.5">
          {/* Overlay Status Header */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-[#23262F] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] text-zinc-300 font-medium">{tLabels.overlayLabel}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400 tabular-nums">
              <Volume2 className="w-3 h-3 text-zinc-400" />
              <span>{currentTurn.sourceLang} → {selectedLang}</span>
            </div>
          </div>

          {/* Original Transcript Line */}
          <div className="text-xs text-zinc-400 flex items-baseline gap-2 leading-relaxed">
            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#20232B] text-zinc-300 shrink-0">
              {currentTurn.shortName}
            </span>
            <span className="text-zinc-400 line-clamp-1">{currentTurn.sourceText}</span>
          </div>

          {/* Translated Line (High Contrast, Clean Typography) */}
          <div className="text-sm sm:text-[15px] font-medium text-white leading-relaxed pt-0.5">
            {translatedText}
          </div>

          {/* Extracted Action Item Footer inside Overlay */}
          {currentTurn.actionItem && (
            <div className="pt-2 border-t border-[#23262F] flex items-center justify-between gap-2 text-[11px] text-zinc-300">
              <div className="flex items-center gap-1.5 truncate">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate font-mono text-[11px] text-zinc-300">
                  {currentTurn.actionItem.text[selectedLang] || currentTurn.actionItem.text.VI}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 shrink-0">RAM-ONLY</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Control Bar: Language Switcher ── */}
      <div className="px-4 py-2.5 bg-[#16181D] border-t border-[#262930] flex items-center justify-between text-xs">
        <span className="text-[11px] text-zinc-400 font-medium">{tLabels.targetLangLabel}:</span>

        <div className="flex items-center gap-1 bg-[#101216] p-0.5 rounded-md border border-[#262930]">
          {(['VI', 'EN', 'JA'] as TargetLanguage[]).map((lang) => {
            const isSelected = selectedLang === lang;
            const flags = { VI: FlagVN, EN: FlagUS, JA: FlagJP };
            const Flag = flags[lang];
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#2563EB] text-white'
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
