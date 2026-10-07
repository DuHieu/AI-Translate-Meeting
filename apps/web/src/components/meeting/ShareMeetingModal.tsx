import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Copy, Check, QrCode, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { generateQrSvgPath } from '../../utils/qrCodeGenerator';
import { MeetingLinkPreviewCard } from './MeetingLinkPreviewCard';

interface ShareMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingCode: string;
  meetingTitle?: string;
}

export const ShareMeetingModal: React.FC<ShareMeetingModalProps> = ({
  isOpen,
  onClose,
  meetingCode,
  meetingTitle = 'Cuộc họp song ngữ LayaMeet',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined') return `https://layameet.com/meeting/${meetingCode}`;
    return `${window.location.origin}/meeting/${meetingCode}`;
  }, [meetingCode]);

  const qrData = useMemo(() => {
    if (!showQr) return null;
    try {
      return generateQrSvgPath(inviteUrl);
    } catch {
      return null;
    }
  }, [inviteUrl, showQr]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(meetingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `${meetingTitle} · Phòng ${meetingCode}`,
        text: `Tham gia phòng họp song ngữ LayaMeet (${meetingCode}):`,
        url: inviteUrl,
      });
    } catch {
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-meeting-dialog-title"
        className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Clean Google Meet-style Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="share-meeting-dialog-title"
              className="text-base font-bold text-zinc-900 dark:text-zinc-100"
            >
              Cuộc họp của bạn đã sẵn sàng
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Chia sẻ đường dẫn này với những người bạn muốn mời vào phòng họp.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng chia sẻ"
            className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rich Social/Chat Unfurl Preview Card (shows logo + title + room code + URL) */}
        <MeetingLinkPreviewCard
          url={inviteUrl}
          meetingCode={meetingCode}
          meetingTitle={meetingTitle}
          interactive={false}
        />

        {/* Primary Action: 1-Click Copy Meeting Link (Google Meet style) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer shadow-sm shadow-blue-600/20"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Đã sao chép đường dẫn</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Sao chép đường dẫn tham gia</span>
              </>
            )}
          </button>

          {canNativeShare && (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              aria-label="Chia sẻ qua ứng dụng khác"
              title="Chia sẻ nhanh"
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition cursor-pointer shrink-0"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Minimal Footer Row: Room Code Pill + Optional QR Toggle */}
        <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopyCode}
            title="Sao chép mã phòng"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
          >
            <span className="text-zinc-500 dark:text-zinc-400">Mã phòng:</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tracking-wide uppercase">
              {meetingCode}
            </span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowQr((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer font-medium"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-500" />
            <span>Mã QR</span>
            {showQr ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Collapsible QR Code (only shown when user clicks "Mã QR") */}
        {showQr && (
          <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-center gap-3.5 animate-in fade-in duration-150">
            <div className="bg-white p-2 rounded-xl shadow-xs border border-zinc-200 shrink-0">
              {qrData ? (
                <svg
                  viewBox={`0 0 ${qrData.sizeWithMargin} ${qrData.sizeWithMargin}`}
                  className="w-24 h-24"
                  shapeRendering="crispEdges"
                >
                  <rect width="100%" height="100%" fill="#ffffff" />
                  <path d={qrData.path} fill="#090d16" />
                </svg>
              ) : (
                <div className="w-24 h-24 flex items-center justify-center text-zinc-400">
                  <QrCode className="w-8 h-8 animate-pulse" />
                </div>
              )}
            </div>
            <div className="space-y-1 text-left">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Quét mã bằng điện thoại
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Mở camera hoặc Zalo quét mã để vào thẳng phòng họp <strong className="font-mono text-zinc-700 dark:text-zinc-200">{meetingCode}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
