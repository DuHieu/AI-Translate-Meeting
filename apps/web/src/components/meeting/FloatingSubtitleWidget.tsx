import React, { useRef, useState } from 'react';
import { GripHorizontal, Minus, Subtitles } from 'lucide-react';
import type { SubtitleMessage } from '../../types/subtitle';

interface FloatingSubtitleWidgetProps {
  subtitles: SubtitleMessage[];
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
}

const VIEWPORT_PADDING = 8;

export const FloatingSubtitleWidget: React.FC<FloatingSubtitleWidgetProps> = ({
  subtitles,
  onClose,
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const recentSubtitles = subtitles.slice(-3).filter(
    (subtitle) => subtitle.translatedText.trim() || subtitle.originalText.trim(),
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;

    const bounds = widgetRef.current?.getBoundingClientRect();
    if (!bounds) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    const widget = widgetRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !widget) return;

    const bounds = widget.getBoundingClientRect();
    const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - bounds.width - VIEWPORT_PADDING);
    const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - bounds.height - VIEWPORT_PADDING);

    setPosition({
      x: Math.min(Math.max(VIEWPORT_PADDING, event.clientX - dragState.offsetX), maxX),
      y: Math.min(Math.max(VIEWPORT_PADDING, event.clientY - dragState.offsetY), maxY),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={widgetRef}
      role="region"
      aria-label="Cửa sổ phụ đề nổi"
      className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl backdrop-blur-md"
      style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      <div
        className="flex touch-none cursor-grab items-center gap-2 border-b border-slate-800 px-3 py-2 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <GripHorizontal className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <Subtitles className="h-4 w-4 text-sky-400" aria-hidden="true" />
        <span className="text-xs font-semibold text-slate-200">Phụ đề nổi</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Thu nhỏ cửa sổ phụ đề nổi"
          title="Thu nhỏ"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-52 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {recentSubtitles.length > 0 ? (
          recentSubtitles.map((subtitle) => (
            <div key={subtitle.id} className="rounded-xl bg-slate-900/80 px-3 py-2">
              <p className="mb-1 truncate text-[11px] font-medium text-sky-400">
                {subtitle.participantName}
              </p>
              <p className="text-sm leading-5 text-slate-100">
                {subtitle.translatedText || subtitle.originalText}
              </p>
            </div>
          ))
        ) : (
          <p className="py-3 text-center text-xs text-slate-500">
            Phụ đề dịch sẽ xuất hiện tại đây.
          </p>
        )}
      </div>
    </div>
  );
};
