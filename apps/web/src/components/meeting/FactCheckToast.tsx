import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import type { FactCheckEvent } from '../../utils/factCheckEngine';

interface FactCheckToastProps {
  event: FactCheckEvent | null;
  onOpenPanel: () => void;
  onDismiss: () => void;
}

export const FactCheckToast: React.FC<FactCheckToastProps> = ({
  event,
  onOpenPanel,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [event, onDismiss]);

  if (!event || !isVisible) return null;

  const isDiscrepancy = event.status === 'DISCREPANCY';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] p-3.5 rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-300 animate-slideUp border ${
        isDiscrepancy
          ? 'bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/50'
          : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
            isDiscrepancy
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isDiscrepancy ? (
            <AlertTriangle className="w-4 h-4 animate-bounce" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${
                isDiscrepancy
                  ? 'bg-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/30 text-emerald-300'
              }`}
            >
              {isDiscrepancy ? 'Cảnh Báo Sai Lệch Thông Số' : 'Đã Xác Thực Tiêu Chuẩn'}
            </span>
            <button
              type="button"
              aria-label="Đóng cảnh báo"
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              className="text-zinc-400 hover:text-white p-0.5 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs font-semibold text-white truncate">
            {event.participantName}: "{event.spokenClaim}"
          </div>

          <p className="text-[11px] leading-snug line-clamp-2 text-zinc-300">
            {event.explanation}
          </p>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 truncate max-w-[190px]">
              {event.source}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsVisible(false);
                onOpenPanel();
              }}
              className={`text-[11px] font-semibold flex items-center gap-0.5 transition cursor-pointer ${
                isDiscrepancy
                  ? 'text-amber-300 hover:text-amber-200'
                  : 'text-emerald-300 hover:text-emerald-200'
              }`}
            >
              <span>Xem đối chiếu</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
