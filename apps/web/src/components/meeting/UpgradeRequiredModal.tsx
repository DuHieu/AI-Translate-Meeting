import React, { useEffect, useRef } from 'react';
import { Clock3, FileText, Headphones, Infinity, LogOut, X, Zap } from 'lucide-react';

interface UpgradeRequiredModalProps {
  isOpen: boolean;
  isTimeExpired: boolean;
  onUpgrade: () => void;
  onLeaveMeeting: () => void;
  onClose?: () => void;
}

const PRO_BENEFITS = [
  { icon: Infinity, label: 'Không giới hạn thời lượng' },
  { icon: Headphones, label: 'Cabin phiên dịch tai nghe' },
  { icon: FileText, label: 'Xuất biên bản họp' },
];

export const UpgradeRequiredModal: React.FC<UpgradeRequiredModalProps> = ({
  isOpen,
  isTimeExpired,
  onUpgrade,
  onLeaveMeeting,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const upgradeButtonRef = useRef<HTMLButtonElement>(null);
  const canDismiss = !isTimeExpired && Boolean(onClose);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    upgradeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canDismiss) {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [canDismiss, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-required-title"
        aria-describedby="upgrade-required-description"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        {canDismiss && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ nâng cấp"
            className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <div className="border-b border-zinc-800 px-6 py-6 sm:px-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
            {isTimeExpired
              ? <Clock3 className="h-6 w-6" aria-hidden="true" />
              : <Zap className="h-6 w-6" aria-hidden="true" />}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            ViMeet Pro
          </p>
          <h2 id="upgrade-required-title" className="mt-1 text-xl font-bold text-white sm:text-2xl">
            {isTimeExpired ? 'Hết thời lượng miễn phí (40 phút)' : 'Nâng cấp ViMeet Pro'}
          </h2>
          <p id="upgrade-required-description" className="mt-3 text-sm leading-6 text-zinc-400">
            {isTimeExpired
              ? 'Cuộc họp đã đạt giới hạn của gói Free. Nâng cấp để tiếp tục mà không cần tạo phòng mới.'
              : 'Mở khóa đầy đủ công cụ họp song ngữ cho đội ngũ của bạn.'}
          </p>
        </div>

        <div className="space-y-3 px-6 py-5 sm:px-8">
          {PRO_BENEFITS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm text-zinc-200">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-800 bg-zinc-900/50 px-6 py-5 sm:flex-row sm:px-8">
          <button
            ref={upgradeButtonRef}
            type="button"
            onClick={onUpgrade}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            Nâng cấp ngay qua VietQR
          </button>
          <button
            type="button"
            onClick={onLeaveMeeting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Rời cuộc họp
          </button>
        </div>
      </div>
    </div>
  );
};
