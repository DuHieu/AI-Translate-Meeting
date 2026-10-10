import React, { useState } from 'react';
import { Copy, Check, X, ShieldCheck, UserPlus } from 'lucide-react';
import { copyText } from '../../utils/clipboard';

interface MeetingReadyCardProps {
  meetingCode: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenInvite?: () => void;
}

export const MeetingReadyCard: React.FC<MeetingReadyCardProps> = ({
  meetingCode,
  isOpen,
  onClose,
  onOpenInvite,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const meetingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/meeting/${meetingCode}`
      : `https://layameet.com/meeting/${meetingCode}`;

  const handleCopyLink = async () => {
    const success = await copyText(meetingUrl);
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="region"
      aria-label="Thông tin liên kết cuộc họp sẵn sàng"
      className="fixed bottom-20 left-4 z-40 w-[calc(100%-2rem)] sm:w-96 bg-white dark:bg-[#1a1b20] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-900 dark:text-zinc-100 space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white leading-tight">
            Cuộc họp của bạn đã sẵn sàng
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Chia sẻ đường liên kết này với những người bạn muốn họp cùng.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="w-7 h-7 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Copy link button (Google Meet style) */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={`w-full py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
          copied
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 hover:bg-blue-500 text-white active:bg-blue-700 shadow-blue-500/20'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-200" />
            <span>Đã sao chép liên kết tham gia</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Sao chép đường liên kết tham gia</span>
          </>
        )}
      </button>

      {/* URL Display Pill */}
      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="font-mono text-zinc-600 dark:text-zinc-300 truncate select-all pr-2">
          {meetingUrl}
        </span>
        <button
          type="button"
          onClick={handleCopyLink}
          title="Sao chép"
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-1 rounded transition shrink-0"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Bảo mật RAM-only</span>
        </span>
        {onOpenInvite && (
          <button
            type="button"
            onClick={onOpenInvite}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm người khác</span>
          </button>
        )}
      </div>
    </div>
  );
};
