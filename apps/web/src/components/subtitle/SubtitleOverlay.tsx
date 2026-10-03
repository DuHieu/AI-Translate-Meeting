import React, { useState } from 'react';
import { PipelineStatusMessage, SubtitleMessage } from '../../types/subtitle';
import { Zap, CheckCircle2, ArrowUpDown, Volume2, Sparkles } from 'lucide-react';
import { speakText, stopSpeech } from '../../utils/speechAndAudio';

interface SubtitleOverlayProps {
  subtitle?: SubtitleMessage | null;
  subtitles?: SubtitleMessage[];
  pipelineStatuses?: Record<string, PipelineStatusMessage>;
  defaultPosition?: 'bottom' | 'top';
}


// One color per speaker slot — muted, professional, readable on dark video
const SPEAKER_PALETTES = [
  { dot: 'bg-blue-400',   text: 'text-zinc-100' },
  { dot: 'bg-green-400',  text: 'text-zinc-100' },
  { dot: 'bg-violet-400', text: 'text-zinc-100' },
  { dot: 'bg-amber-400',  text: 'text-zinc-100' },
  { dot: 'bg-rose-400',   text: 'text-zinc-100' },
  { dot: 'bg-teal-400',   text: 'text-zinc-100' },
];

function getSpeakerPalette(nameOrId?: string) {
  if (!nameOrId) return SPEAKER_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < nameOrId.length; i++) {
    hash = (hash << 5) - hash + nameOrId.charCodeAt(i);
    hash |= 0;
  }
  return SPEAKER_PALETTES[Math.abs(hash) % SPEAKER_PALETTES.length];
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  subtitle,
  subtitles,
  pipelineStatuses,
  defaultPosition = 'bottom',
}) => {
  const [position, setPosition] = useState<'bottom' | 'top'>(() => {
    return (localStorage.getItem('ai-subtitle-position') as 'bottom' | 'top') || defaultPosition;
  });
  const [playingId, setPlayingId] = useState<string | null>(null);

  const togglePosition = () => {
    const next = position === 'bottom' ? 'top' : 'bottom';
    setPosition(next);
    localStorage.setItem('ai-subtitle-position', next);
  };

  const handleReplay = (id: string, text: string) => {
    if (playingId === id) {
      stopSpeech();
      setPlayingId(null);
    } else {
      speakText(
        text,
        undefined,
        () => setPlayingId(id),
        () => setPlayingId(null)
      );
    }
  };

  const activeList = subtitles && subtitles.length > 0
    ? subtitles
    : subtitle ? [subtitle] : [];

  const translatingStatuses = Object.values(pipelineStatuses || {}).filter(
    (s) => s.phase === 'translating'
  );

  if (activeList.length === 0 && translatingStatuses.length === 0) return null;

  // Footer is now 56px (h-14). Give 72px clearance from bottom.
  const positionClass = position === 'top' ? 'top-16' : 'bottom-[72px]';

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 z-30 max-w-3xl w-full px-4 pointer-events-none transition-all duration-300 ease-out space-y-2 ${positionClass}`}
    >
      {/* Soft floor indicator: displays when speech is actively undergoing translation */}
      {translatingStatuses.length > 0 && (
        <div className="flex justify-center pointer-events-none mb-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#070d18]/90 border border-cyan-500/40 text-cyan-300 text-xs shadow-lg shadow-cyan-950/50 backdrop-blur-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">
              Đang chuyển ngữ lời nói ({translatingStatuses.map((s) => s.liveKitIdentity).filter(Boolean).join(', ') || 'diễn giả'})...
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/20 text-cyan-200 uppercase tracking-wider">
              Soft Floor
            </span>
          </div>
        </div>
      )}

      {/* Position toggle */}
      <div className="flex justify-end pointer-events-auto">
        <button
          type="button"

          onClick={togglePosition}
          title={position === 'bottom' ? 'Chuyển phụ đề lên trên' : 'Chuyển phụ đề xuống dưới'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0f0f10]/90 hover:bg-[#1a1a1b] text-zinc-400 hover:text-zinc-200 border border-[#3a3a3d] text-[11px] font-medium transition-colors cursor-pointer"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{position === 'bottom' ? 'Đưa lên trên' : 'Đưa xuống dưới'}</span>
        </button>
      </div>

      {activeList.map((item) => {
        const hasAction = item.tags?.includes('action_item');
        const hasDecision = item.tags?.includes('decision');
        const palette = getSpeakerPalette(item.participantName || item.participantId);
        const itemId = item.id || item.participantId;
        const isPlaying = playingId === itemId;

        return (
          <div
            key={item.id || item.participantId}
            className={`relative bg-[#0f0f10]/92 border rounded-xl py-3 px-4 sm:px-5 transition-all duration-200 ease-out ${
              hasAction
                ? 'border-amber-600/50'
                : hasDecision
                ? 'border-green-600/50'
                : 'border-[#3a3a3d]'
            }`}
          >
            {/* Speaker header */}
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Speaker dot + name */}
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                  <span className={`w-2 h-2 rounded-full ${palette.dot} shrink-0`} />
                  {item.participantName || 'Người phát biểu'}
                </span>

                {/* Audio replay */}
                <button
                  type="button"
                  onClick={() => handleReplay(itemId, item.translatedText || item.originalText)}
                  title={isPlaying ? 'Dừng phát âm' : 'Nghe phát âm lời thoại'}
                  className={`pointer-events-auto p-1 rounded transition-colors cursor-pointer ${
                    isPlaying
                      ? 'text-blue-400'
                      : 'text-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Laya tags */}
              <div className="flex items-center gap-1.5">
                {hasAction && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60">
                    <Zap className="w-2.5 h-2.5" />
                    Action {item.confidence ? `${Math.round(item.confidence * 100)}%` : ''}
                  </span>
                )}
                {hasDecision && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-950/60 text-green-400 border border-green-800/60">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Decision {item.confidence ? `${Math.round(item.confidence * 100)}%` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Translated text */}
            <p className="text-base sm:text-lg font-medium text-zinc-50 leading-snug">
              {item.translatedText}
            </p>

            {/* Original text */}
            {item.originalText && item.originalText !== item.translatedText && (
              <p className="text-xs text-zinc-500 italic mt-1 leading-relaxed">
                {item.originalText}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
