import React, { useEffect, useMemo, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { SubtitleMessage } from '../../types/subtitle';
import { getLanguageOption } from '../../types/meeting';
import { formatTimestamp } from '../../utils';
import { speakText } from '../../utils/speechAndAudio';
import { CountryFlag } from '../common/CountryFlag';

export const LIVE_SUBTITLE_LIMIT = 12;

interface LiveSubtitleViewProps {
  history: SubtitleMessage[];
  showOriginal: boolean;
}

export const LiveSubtitleView: React.FC<LiveSubtitleViewProps> = ({ history, showOriginal }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const visibleSubtitles = useMemo(
    () => history.filter((item) => item.isFinal).slice(-LIVE_SUBTITLE_LIMIT),
    [history],
  );
  const latestSubtitleId = visibleSubtitles.length > 0
    ? visibleSubtitles[visibleSubtitles.length - 1].id
    : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleSubtitles.length, latestSubtitleId]);

  if (visibleSubtitles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-zinc-500">
        Phụ đề mới sẽ tự động xuất hiện tại đây.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
      <div className="space-y-1">
        {visibleSubtitles.map((item) => {
          const sourceLang = getLanguageOption(item.sourceLanguage);
          return (
            <article key={item.id} className="border-b border-slate-800 px-1 py-3 last:border-b-0">
              <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate font-medium text-sky-400 flex items-center gap-1.5">
                  <CountryFlag code={sourceLang.code} size="xs" />
                  <span className="truncate">{item.participantName || 'Người phát biểu'}</span>
                  <span className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-zinc-400 uppercase">
                    {sourceLang.code}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <time className="text-zinc-600">{formatTimestamp(item.timestamp)}</time>
                  <button
                    type="button"
                    onClick={() => speakText(item.translatedText || item.originalText, item.targetLanguage)}
                    className="rounded p-1 text-zinc-500 transition-colors hover:bg-slate-800 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    aria-label={`Đọc phụ đề của ${item.participantName || 'người phát biểu'}`}
                    title="Nghe phụ đề"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="text-[15px] leading-6 text-zinc-100">{item.translatedText}</p>
              {showOriginal && item.originalText && item.originalText !== item.translatedText && (
                <p className="mt-1 text-xs italic leading-5 text-zinc-500">{item.originalText}</p>
              )}
            </article>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};
