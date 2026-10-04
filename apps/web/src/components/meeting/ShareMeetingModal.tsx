import React, { useState, useMemo } from 'react';
import { X, Copy, Check, QrCode, Share2, Mail, ExternalLink, Smartphone } from 'lucide-react';
import { generateQrSvgPath } from '../../utils/qrCodeGenerator';

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
  const [copiedFullInvite, setCopiedFullInvite] = useState(false);

  const inviteUrl = useMemo(() => {
    if (typeof window === 'undefined') return `https://layameet.com/prejoin/${meetingCode}`;
    return `${window.location.origin}/prejoin/${meetingCode}`;
  }, [meetingCode]);

  const qrData = useMemo(() => {
    try {
      return generateQrSvgPath(inviteUrl);
    } catch {
      return null;
    }
  }, [inviteUrl]);

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

  const fullInviteText = `Kính mời bạn tham gia: ${meetingTitle}\nThời gian thực: Song ngữ dịch AI trực tiếp\nMã phòng: ${meetingCode}\nĐường dẫn tham gia: ${inviteUrl}\n(Hỗ trợ cả máy tính & điện thoại)`;

  const handleCopyFullInvite = () => {
    navigator.clipboard?.writeText(fullInviteText);
    setCopiedFullInvite(true);
    setTimeout(() => setCopiedFullInvite(false), 2000);
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(`Tham gia cuộc họp song ngữ LayaMeet: ${inviteUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Lời mời tham gia: ${meetingTitle}`);
    const body = encodeURIComponent(fullInviteText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 font-bold text-slate-100 text-lg">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Share2 className="w-4 h-4" />
            </div>
            <span>Mời &amp; Mã QR Tham Gia</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chia sẻ"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="space-y-5 overflow-y-auto pr-1">
          {/* QR Code Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
            <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200/20 inline-block">
              {qrData ? (
                <svg
                  viewBox={`0 0 ${qrData.sizeWithMargin} ${qrData.sizeWithMargin}`}
                  className="w-44 h-44 sm:w-48 sm:h-48"
                  shapeRendering="crispEdges"
                >
                  <rect width="100%" height="100%" fill="#ffffff" />
                  <path d={qrData.path} fill="#090d16" />
                </svg>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                  <QrCode className="w-12 h-12 text-slate-500 animate-pulse" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Quét bằng điện thoại để vào họp ngay</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Không cần cài ứng dụng. Trình duyệt tự động mở phụ đề song ngữ.
              </p>
            </div>
          </div>

          {/* Meeting Code Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Mã phòng họp</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 font-mono text-base font-bold text-sky-400 tracking-wider">
                {meetingCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Đã chép' : 'Chép mã'}</span>
              </button>
            </div>
          </div>

          {/* Direct Invite Link */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Đường dẫn tham gia trực tiếp</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 shadow-md shadow-sky-600/20"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Đã chép' : 'Chép link'}</span>
              </button>
            </div>
          </div>

          {/* Quick Sharing Buttons */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <p className="text-xs font-medium text-slate-400">Chia sẻ nhanh qua kênh khác:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyFullInvite}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedFullInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFullInvite ? 'Đã sao chép' : 'Sao chép toàn bộ'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareTelegram}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>Gửi Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleShareEmail}
                className="col-span-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Gửi qua Email lời mời</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
