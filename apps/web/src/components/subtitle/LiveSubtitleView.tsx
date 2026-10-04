import React, { useEffect, useMemo, useRef } from 'react';
import { SubtitleMessage } from '../../types/subtitle';
import { formatTimestamp } from '../../utils';

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
        {visibleSubtitles.map((item) => (
          <article key={item.id} className="border-b border-white/[0.06] px-1 py-3 last:border-b-0">
            <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate font-medium text-sky-400">
                {item.participantName || 'Người phát biểu'}
              </span>
              <time className="shrink-0 text-zinc-600">{formatTimestamp(item.timestamp)}</time>
            </div>
            <p className="text-[15px] leading-6 text-zinc-100">{item.translatedText}</p>
            {showOriginal && item.originalText && item.originalText !== item.translatedText && (
              <p className="mt-1 text-xs italic leading-5 text-zinc-500">{item.originalText}</p>
            )}
          </article>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};
