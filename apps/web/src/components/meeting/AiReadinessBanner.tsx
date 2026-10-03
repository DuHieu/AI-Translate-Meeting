import type { AiReadinessState } from '../../services/aiHealthService';

interface AiReadinessBannerProps {
  state: AiReadinessState;
  onRetry: () => void;
}

export function AiReadinessBanner({ state, onRetry }: AiReadinessBannerProps) {
  if (state === 'ready') return null;

  const isStarting = state === 'starting';

  return (
    <div className="absolute top-24 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto max-w-lg rounded-2xl border px-4 py-2.5 text-sm shadow-xl backdrop-blur-md ${
          isStarting
            ? 'border-amber-400/40 bg-amber-950/90 text-amber-50'
            : 'border-rose-400/40 bg-slate-900/95 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isStarting ? 'animate-pulse bg-amber-300' : 'bg-rose-400'
            }`}
          />
          <span>
            {isStarting
              ? 'AI đang khởi động, phụ đề sẽ tự bật khi sẵn sàng.'
              : 'AI phụ đề tạm thời chưa sẵn sàng.'}
          </span>
          {!isStarting && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 shrink-0 rounded-lg border border-slate-500 px-2.5 py-1 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
