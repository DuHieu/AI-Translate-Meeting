import React from 'react';
import { AdaptiveDialog } from '../common/AdaptiveDialog';
import { ShieldAlert, Lock, RefreshCw, X, Mic, Video } from 'lucide-react';

interface PermissionBlockedModalProps {
  deviceType: 'microphone' | 'camera' | 'both';
  errorMessage?: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export const PermissionBlockedModal: React.FC<PermissionBlockedModalProps> = ({
  deviceType,
  errorMessage,
  onRetry,
  onDismiss,
}) => {
  const getTitle = () => {
    if (deviceType === 'both') return 'Microphone và Camera đang bị chặn truy cập';
    if (deviceType === 'microphone') return 'Microphone đang bị chặn truy cập';
    return 'Camera đang bị chặn truy cập';
  };

  return (
    <AdaptiveDialog label={getTitle()} onClose={onDismiss}>
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl space-y-4 relative">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng hướng dẫn quyền thiết bị"
          className="absolute top-3 right-3 w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-white">{getTitle()}</h3>
            <p className="text-xs text-slate-400">Trình duyệt chưa cho phép trang web sử dụng thiết bị.</p>
          </div>
        </div>

        {/* Browser URL Bar Guidance Illustration (Google Meet style) */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{window.location.host} / meeting</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-bold shrink-0">
                1
              </span>
              <span>
                Nhấp vào biểu tượng <strong>Ổ khóa 🔒</strong> hoặc cài đặt trang bên trái thanh địa chỉ URL.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-bold shrink-0">
                2
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span>Chuyển quyền</span>
                {deviceType !== 'camera' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                    <Mic className="w-3 h-3 text-sky-400" /> Microphone
                  </span>
                )}
                {deviceType !== 'microphone' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                    <Video className="w-3 h-3 text-sky-400" /> Camera
                  </span>
                )}
                <span>thành <strong>&quot;Cho phép&quot; (Allow)</strong>.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[11px] font-bold shrink-0">
                3
              </span>
              <span>Bấm nút <strong>&quot;Thử lại ngay&quot;</strong> bên dưới hoặc tải lại trang.</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <p className="text-[11px] text-slate-400 font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 truncate">
            Chi tiết: {errorMessage}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại ngay</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs md:text-sm transition border border-slate-700 cursor-pointer"
          >
            <span>Tiếp tục (chỉ nghe)</span>
          </button>
        </div>
      </div>
    </AdaptiveDialog>
  );
};
