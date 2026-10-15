import React from 'react';
import { X, Download, Monitor, CheckCircle2, ShieldCheck, Zap, ExternalLink } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, language = 'vi' }) => {
  if (!isOpen) return null;

  const isJa = language === 'ja';
  const isEn = language === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hộp thoại tải về"
          className="absolute top-5 right-5 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 id="download-modal-title" className="text-xl font-bold text-slate-900">
              {isJa
                ? 'LayaMeet Desktop for Windows'
                : isEn
                ? 'LayaMeet Desktop for Windows'
                : 'Tải LayaMeet Desktop cho Windows'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Phiên bản v1.0.0 • 64-bit • Windows 10/11 • 15 MB
            </p>
          </div>
        </div>

        {/* Value badges */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <Zap className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">
              {isJa ? '遅延<350ms' : isEn ? 'Latency <350ms' : 'Độ trễ <350ms'}
            </div>
            <div className="text-[9px] text-slate-500">WASAPI Loopback</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">100% RAM-Only</div>
            <div className="text-[9px] text-slate-500">
              {isJa ? '音声非保存' : isEn ? 'Zero raw audio' : 'Không lưu âm thanh'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">
              {isJa ? 'Zoom/Meet対応' : isEn ? 'Zoom/Meet' : 'Zoom & Meet'}
            </div>
            <div className="text-[9px] text-slate-500">
              {isJa ? 'ボット不要' : isEn ? 'No bot needed' : 'Không cần bot'}
            </div>
          </div>
        </div>

        {/* 3 Step Quick Guide */}
        <div className="space-y-3 mb-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {isJa ? '簡単3ステップで開始' : isEn ? 'Quick 3-step setup' : '3 Bước Bắt Đầu Nhanh'}
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                {isJa
                  ? 'インストーラーをダウンロードして起動します（数秒で完了）。'
                  : isEn
                  ? 'Download and launch the installer (takes only a few seconds).'
                  : 'Tải bộ cài đặt và khởi chạy (chỉ 15MB, cài đặt trong vài giây).'}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                {isJa
                  ? 'ZoomやGoogle Meetで通常通りミーティングに参加します。'
                  : isEn
                  ? 'Open your meeting in Zoom or Google Meet as usual.'
                  : 'Mở cuộc họp trong Zoom hoặc Google Meet như bình thường.'}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                {isJa
                  ? 'LayaMeetが音声を自動検知し、透明な字幕バーを画面最前面に表示します。'
                  : isEn
                  ? 'LayaMeet auto-detects audio and renders floating bilingual subtitles.'
                  : 'LayaMeet tự động bắt âm thanh và hiển thị phụ đề nổi song ngữ tức thì.'}
              </span>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="space-y-2.5">
          <a
            href="/downloads/LayaMeet-Desktop-Setup-v1.0.0.exe"
            download="LayaMeet-Desktop-Setup-v1.0.0.exe"
            onClick={() => {
              // Production download link or direct installer
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer group"
          >
            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
            <span>
              {isJa
                ? 'Windows版をダウンロード (.exe)'
                : isEn
                ? 'Download for Windows (.exe)'
                : 'Tải Xuống Bản Cài Đặt (.exe)'}
            </span>
            <span className="text-xs bg-blue-500/40 px-2 py-0.5 rounded-full ml-1">
              15 MB
            </span>
          </a>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
            <span>SHA-256 Verified • Windows Defender Safe</span>
            <a
              href="https://github.com/DuHieu/AI-Translate-Meeting/releases"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>GitHub Releases</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* SmartScreen micro-tip */}
          <div className="mt-2 p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2">
            <span className="shrink-0 text-xs mt-0.5">💡</span>
            <span>
              {isJa
                ? 'Windows SmartScreenが表示された場合は、「詳細情報」➔「実行」をクリックして開始してください。'
                : isEn
                ? 'If Windows SmartScreen appears, click "More info" ➔ "Run anyway" to complete setup.'
                : 'Nếu Windows SmartScreen hiển thị thông báo, hãy bấm "More info" (Thông tin thêm) ➔ "Run anyway" (Vẫn chạy).'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
