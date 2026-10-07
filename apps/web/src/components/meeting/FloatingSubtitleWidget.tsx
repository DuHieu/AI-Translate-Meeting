import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GripHorizontal, Minus, PictureInPicture2, Subtitles } from 'lucide-react';
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

interface DocumentPictureInPictureApi {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

type WindowWithDocumentPictureInPicture = Window & {
  documentPictureInPicture?: DocumentPictureInPictureApi;
};

function renderPipSubtitles(pipWindow: Window, subtitles: SubtitleMessage[]) {
  const root = pipWindow.document.getElementById('layameet-pip-subtitles');
  if (!root) return;

  const nodes = subtitles.length > 0
    ? subtitles.map((subtitle) => {
        const item = pipWindow.document.createElement('article');
        item.className = 'subtitle-item';
        const speaker = pipWindow.document.createElement('p');
        speaker.className = 'speaker';
        speaker.textContent = subtitle.participantName || 'Người phát biểu';
        const translation = pipWindow.document.createElement('p');
        translation.className = 'translation';
        translation.textContent = subtitle.translatedText || subtitle.originalText;
        item.append(speaker, translation);
        if (subtitle.originalText && subtitle.originalText !== subtitle.translatedText) {
          const original = pipWindow.document.createElement('p');
          original.className = 'original';
          original.textContent = subtitle.originalText;
          item.append(original);
        }
        return item;
      })
    : [Object.assign(pipWindow.document.createElement('p'), {
        className: 'empty',
        textContent: 'Phụ đề dịch sẽ xuất hiện tại đây.',
      })];

  root.replaceChildren(...nodes);
}

export const FloatingSubtitleWidget: React.FC<FloatingSubtitleWidgetProps> = ({
  subtitles,
  onClose,
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [pipStatus, setPipStatus] = useState<string | null>(null);
  const [isPipOpen, setIsPipOpen] = useState(false);
  const recentSubtitles = useMemo(
    () => subtitles.slice(-3).filter(
      (subtitle) => subtitle.translatedText.trim() || subtitle.originalText.trim(),
    ),
    [subtitles],
  );

  useEffect(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      renderPipSubtitles(pipWindowRef.current, recentSubtitles);
    }
  }, [recentSubtitles]);

  useEffect(() => () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) pipWindowRef.current.close();
  }, []);

  const handleDocumentPictureInPicture = async () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPipOpen(false);
      setPipStatus(null);
      return;
    }

    const api = (window as WindowWithDocumentPictureInPicture).documentPictureInPicture;
    if (!api) {
      setPipStatus('Trình duyệt chưa hỗ trợ Document PiP. Widget nổi trong trang vẫn hoạt động.');
      return;
    }

    try {
      const pipWindow = await api.requestWindow({ width: 520, height: 300 });
      pipWindowRef.current = pipWindow;
      pipWindow.document.title = 'Phụ đề song ngữ · LayaMeet';

      const style = pipWindow.document.createElement('style');
      style.textContent = `
        :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #09090b; color: #f4f4f5; }
        header { position: sticky; top: 0; padding: 10px 14px; border-bottom: 1px solid #27272a; background: #09090bf2; color: #38bdf8; font-size: 12px; font-weight: 700; }
        main { display: grid; gap: 8px; padding: 12px; }
        .subtitle-item { border: 1px solid #27272a; border-radius: 12px; background: #18181b; padding: 10px 12px; }
        p { margin: 0; }
        .speaker { color: #38bdf8; font-size: 11px; font-weight: 600; }
        .translation { margin-top: 4px; font-size: 16px; line-height: 1.45; }
        .original { margin-top: 4px; color: #a1a1aa; font-size: 12px; line-height: 1.4; }
        .empty { padding: 32px 12px; color: #71717a; text-align: center; font-size: 13px; }
      `;
      const header = pipWindow.document.createElement('header');
      header.textContent = 'LayaMeet · Phụ đề song ngữ trực tiếp';
      const root = pipWindow.document.createElement('main');
      root.id = 'layameet-pip-subtitles';
      root.setAttribute('aria-live', 'polite');
      pipWindow.document.head.append(style);
      pipWindow.document.body.append(header, root);
      renderPipSubtitles(pipWindow, recentSubtitles);

      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setIsPipOpen(false);
      }, { once: true });
      setIsPipOpen(true);
      setPipStatus(null);
    } catch {
      setPipStatus('Không thể mở PiP. Widget nổi trong trang vẫn hoạt động.');
    }
  };

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
          onClick={() => void handleDocumentPictureInPicture()}
          aria-pressed={isPipOpen}
          title={isPipOpen ? 'Đóng PiP ngoài màn hình' : 'Mở PiP ngoài màn hình'}
          className="ml-auto flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-2 text-[11px] text-sky-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <PictureInPicture2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isPipOpen ? 'Đóng PiP' : 'Mở PiP ngoài màn hình'}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Thu nhỏ cửa sổ phụ đề nổi"
          title="Thu nhỏ"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {pipStatus && <p role="status" className="border-b border-slate-800 px-3 py-2 text-[11px] text-amber-300">{pipStatus}</p>}

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
