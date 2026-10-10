import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, X, ArrowRight, Video, ShieldCheck } from 'lucide-react';
import { copyText } from '../../utils/clipboard';
import { scrollLock } from '../../utils/scrollLock';
import { useLanguage } from '../../context/language-context-def';

interface CreateMeetingForLaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingCode: string;
}

const MODAL_I18N: Record<string, {
  title: string;
  description: string;
  copyButton: string;
  copiedText: string;
  joinNow: string;
  roomCodeLabel: string;
  securityBadge: string;
  close: string;
}> = {
  vi: {
    title: 'Dưới đây là đường liên kết đến cuộc họp của bạn',
    description:
      'Sao chép đường liên kết này rồi gửi cho những người bạn muốn họp cùng. Hãy lưu lại đường liên kết để bạn có thể sử dụng sau.',
    copyButton: 'Sao chép đường liên kết',
    copiedText: 'Đã sao chép liên kết vào bộ nhớ tạm!',
    joinNow: 'Tham gia cuộc họp ngay',
    roomCodeLabel: 'Mã phòng:',
    securityBadge: 'Bảo mật RAM-Only · Zero Raw Audio',
    close: 'Đóng',
  },
  en: {
    title: "Here's the link to your meeting",
    description:
      'Copy this link and send it to people you want to meet with. Be sure to save it so you can use it later, too.',
    copyButton: 'Copy meeting link',
    copiedText: 'Link copied to clipboard!',
    joinNow: 'Join meeting now',
    roomCodeLabel: 'Room code:',
    securityBadge: 'RAM-Only Security · Zero Raw Audio',
    close: 'Close',
  },
  ja: {
    title: '会議へのリンクはこちらです',
    description:
      'このリンクをコピーして、会議に参加してほしい相手に送信してください。後で使用できるように保存しておいてください。',
    copyButton: 'リンクをコピー',
    copiedText: 'クリップボードにコピーしました！',
    joinNow: '今すぐ参加する',
    roomCodeLabel: '会議コード:',
    securityBadge: 'RAMオンリー暗号化 · 音声保存なし',
    close: '閉じる',
  },
};

export const CreateMeetingForLaterModal: React.FC<CreateMeetingForLaterModalProps> = ({
  isOpen,
  onClose,
  meetingCode,
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = MODAL_I18N[language] || MODAL_I18N.vi;

  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const meetingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/meeting/${meetingCode}`
      : `https://layameet.com/meeting/${meetingCode}`;

  useEffect(() => {
    if (!isOpen) return;
    const releaseScrollLock = scrollLock.lock();
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      releaseScrollLock();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyText(meetingUrl);
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleJoinNow = () => {
    onClose();
    navigate(`/meeting/${meetingCode}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-for-later-title"
    >
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2
              id="meeting-for-later-title"
              className="text-lg font-bold text-zinc-950 dark:text-white leading-snug"
            >
              {t.title}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t.description}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="w-8 h-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meeting Link Box (Google Meet style) */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
          <input
            type="text"
            readOnly
            value={meetingUrl}
            aria-label={t.title}
            className="flex-1 bg-transparent text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 outline-none truncate select-all px-1"
          />
          <button
            type="button"
            onClick={handleCopy}
            title={t.copyButton}
            aria-label={t.copyButton}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Sao chép</span>
              </>
            )}
          </button>
        </div>

        {copied && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.copiedText}</span>
          </p>
        )}

        {/* Room Code Badge & Security Reassurance */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
          <span className="text-zinc-500 dark:text-zinc-400 font-mono">
            {t.roomCodeLabel}{' '}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold uppercase tracking-wider">
              {meetingCode}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{t.securityBadge}</span>
          </span>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
          >
            {t.close}
          </button>
          <button
            type="button"
            onClick={handleJoinNow}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-blue-500/25 transition cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span>{t.joinNow}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
