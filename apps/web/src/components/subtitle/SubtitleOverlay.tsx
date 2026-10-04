import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Sparkles, X } from 'lucide-react';
import { PipelineStatusMessage, SubtitleMessage } from '../../types/subtitle';
import { formatTimestamp } from '../../utils';
import { LIVE_SUBTITLE_LIMIT } from './LiveSubtitleView';

interface SubtitleOverlayProps {
  subtitle?: SubtitleMessage | null;
  recentSubtitles: SubtitleMessage[];
  pipelineStatuses?: Record<string, PipelineStatusMessage>;
  showOriginal: boolean;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  subtitle,
  recentSubtitles,
  pipelineStatuses,
  showOriginal,
}) => {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const translatingCount = Object.values(pipelineStatuses || {}).filter(
    (status) => status.phase === 'translating',
  ).length;
  const mobileHistory = useMemo(
    () => recentSubtitles.filter((item) => item.isFinal).slice(-LIVE_SUBTITLE_LIMIT),
    [recentSubtitles],
  );

  useEffect(() => {
    if (!isMobileSheetOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileSheetOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSheetOpen]);

  if (!subtitle && translatingCount === 0 && !isMobileSheetOpen) return null;

  const isRisk = subtitle?.tags?.includes('critical_risk');

  return (
    <>
      <div className="pointer-events-none absolute bottom-[72px] left-1/2 z-30 w-full max-w-3xl -translate-x-1/2 px-3 sm:px-4">
        {translatingCount > 0 && !subtitle && (
          <div className="mb-2 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-black/75 px-3 py-1.5 text-xs text-sky-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> Đang dịch…
            </span>
          </div>
        )}

        {subtitle && (
          <div
            className={`relative w-full rounded-xl border px-4 py-3 text-left shadow-xl backdrop-blur-md transition-all ${
              isRisk
                ? 'border-rose-500/80 bg-black/90 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                : 'border-white/15 bg-black/80'
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="block text-[11px] font-medium text-sky-300">
                {subtitle.participantName || 'Người phát biểu'}
              </span>
              {isRisk && (
                <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                  <AlertTriangle className="h-3 w-3" /> CẢNH BÁO RỦI RO
                </span>
              )}
            </div>
            <span className="line-clamp-2 block text-sm font-medium leading-5 text-white sm:text-base">
              {subtitle.translatedText}
            </span>
            {showOriginal && subtitle.originalText && subtitle.originalText !== subtitle.translatedText && (
              <span className="mt-1 block truncate text-xs italic text-zinc-400">{subtitle.originalText}</span>
            )}
            <button
              type="button"
              onClick={() => setIsMobileSheetOpen(true)}
              className="pointer-events-auto absolute inset-0 md:hidden"
              aria-label="Mở phụ đề gần đây"
            />
          </div>
        )}
      </div>

      {isMobileSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" role="dialog" aria-modal="true" aria-label="Phụ đề gần đây">
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] rounded-t-3xl border-t border-white/10 bg-[#111112] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Phụ đề gần đây</h2>
                <p className="text-[11px] text-zinc-500">Hiển thị tối đa {LIVE_SUBTITLE_LIMIT} câu mới nhất</p>
              </div>
              <button type="button" onClick={() => setIsMobileSheetOpen(false)} aria-label="Đóng phụ đề gần đây" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(70vh-64px)] overflow-y-auto px-4 py-2">
              {mobileHistory.map((item) => (
                <article key={item.id} className="border-b border-white/[0.06] py-3 last:border-b-0">
                  <div className="mb-1 flex justify-between gap-3 text-[11px] text-zinc-500">
                    <span className="truncate text-sky-400">{item.participantName || 'Người phát biểu'}</span>
                    <time>{formatTimestamp(item.timestamp)}</time>
                  </div>
                  <p className="text-sm leading-5 text-zinc-100">{item.translatedText}</p>
                  {showOriginal && item.originalText && item.originalText !== item.translatedText && (
                    <p className="mt-1 text-xs italic text-zinc-500">{item.originalText}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
