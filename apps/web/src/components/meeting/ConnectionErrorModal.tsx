import React from 'react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { WifiOff, RefreshCw, X, AlertTriangle } from 'lucide-react';

interface ConnectionErrorModalProps {
  errorMessage?: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export const ConnectionErrorModal: React.FC<ConnectionErrorModalProps> = ({
  errorMessage,
  onRetry,
  onDismiss,
}) => {
  return (
    <AdaptiveDialog label="Lỗi kết nối cuộc họp" onClose={onDismiss}>
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng lỗi kết nối"
          className="absolute top-3 right-3 w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
            <WifiOff className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-white">
              Không thể kết nối tới máy chủ cuộc họp
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              LiveKit signaling server hiện không phản hồi.
            </p>
          </div>
        </div>

        {/* Detail */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p>Kết nối WebRTC với LiveKit bị gián đoạn. Các nguyên nhân phổ biến:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Mất kết nối mạng tạm thời</li>
                <li>ICE negotiation thất bại (NAT/firewall)</li>
                <li>Server restart hoặc phiên hết hạn</li>
              </ul>
            </div>
          </div>
        </div>

        {errorMessage && (
          <p className="text-[11px] text-slate-400 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 break-all">
            Chi tiết: {errorMessage}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử kết nối lại</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs md:text-sm transition border border-slate-700 cursor-pointer"
          >
            <span>Bỏ qua</span>
          </button>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
