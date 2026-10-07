import React, { useState, useEffect, useRef } from 'react';

interface EmptyCallTimeoutModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
  initialSeconds?: number;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const EmptyCallTimeoutModal: React.FC<EmptyCallTimeoutModalProps> = ({
  isOpen,
  onStay,
  onLeave,
  initialSeconds = 110, // ~1:50
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const onLeaveRef = useRef(onLeave);
  const onStayRef = useRef(onStay);
  const hasTriggeredLeaveRef = useRef(false);

  // Keep callback references synchronized without triggering effect reruns
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    onStayRef.current = onStay;
  }, [onStay]);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(initialSeconds);
      hasTriggeredLeaveRef.current = false;
      return;
    }

    hasTriggeredLeaveRef.current = false;
    const targetEndTime = Date.now() + initialSeconds * 1000;
    setSecondsLeft(initialSeconds);

    const updateTimer = () => {
      const remainingMs = targetEndTime - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(remainingSec);

      if (remainingSec <= 0) {
        if (!hasTriggeredLeaveRef.current) {
          hasTriggeredLeaveRef.current = true;
          onLeaveRef.current();
        }
      }
    };

    // Update every 250ms for responsive tick down
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [isOpen, initialSeconds]);

  if (!isOpen) return null;

  const handleLeaveClick = () => {
    if (!hasTriggeredLeaveRef.current) {
      hasTriggeredLeaveRef.current = true;
      onLeaveRef.current();
    }
  };

  const handleStayClick = () => {
    onStayRef.current();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="empty-call-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#28292a] text-zinc-800 dark:text-zinc-100 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-700/60 flex flex-col items-center text-center space-y-4">
        {/* Circular Countdown Badge */}
        <div className="w-16 h-16 rounded-full bg-[#e8f0fe] dark:bg-[#1a2e4c] text-[#1a73e8] dark:text-[#8ab4f8] font-medium text-lg flex items-center justify-center tracking-tight shadow-inner font-mono">
          {formatCountdown(secondsLeft)}
        </div>

        {/* Title */}
        <h2 id="empty-call-title" className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Bạn còn ở đó không?
        </h2>

        {/* Descriptions */}
        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Vì bạn là người duy nhất ở đây nên cuộc gọi này sẽ kết thúc sau chưa đầy 2 phút nữa. Bạn có muốn ở lại cuộc gọi này không?
        </p>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
          Để ngừng nhận thông báo này, hãy chuyển đến phần Cài đặt &gt; Cài đặt chung.
        </p>

        {/* Action Buttons */}
        <div className="w-full flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={handleLeaveClick}
            className="px-3.5 py-2 text-sm font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
          >
            Rời đi bây giờ
          </button>
          <button
            type="button"
            onClick={handleStayClick}
            className="px-3.5 py-2 text-sm font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
          >
            Tiếp tục tham gia cuộc gọi
          </button>
        </div>
      </div>
    </div>
  );
};
