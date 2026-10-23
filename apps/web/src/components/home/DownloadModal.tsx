import React, { useState } from 'react';
import { X, Download, ShieldCheck, ExternalLink } from 'lucide-react';
import { DESKTOP_RELEASE } from '../../config/desktopRelease';
import { LayaMeetLogo } from '../common/LayaMeetLogo';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, language = 'vi' }) => {
  const [started, setStarted] = useState(false);

  if (!isOpen) return null;

  const isJa = language === 'ja';
  const isEn = language === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
        className="relative z-10 w-full max-w-lg bg-white dark:bg-[#151921] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 md:p-7 text-slate-900 dark:text-slate-100"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hộp thoại tải về"
          className="absolute top-5 right-5 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <LayaMeetLogo size="lg" showWordmark={false} />
          <div>
            <h3 id="download-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {isJa
                ? 'LayaMeet Desktop for Windows'
                : isEn
                ? 'LayaMeet Desktop for Windows'
                : 'Tải LayaMeet Desktop cho Windows'}
            </h3>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              v{DESKTOP_RELEASE.version} · {DESKTOP_RELEASE.platform} · {DESKTOP_RELEASE.sizeLabel}
            </p>
          </div>
        </div>

        {/* 3 Step Quick Guide */}
        <div className="space-y-3 mb-6 bg-slate-50 dark:bg-[#11151C] p-4 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs font-mono uppercase tracking-wider font-semibold text-[#0F766E] dark:text-teal-400">
            {isJa ? '3ステップで会議を開始' : isEn ? '3-step quick start' : 'Quy trình triển khai 3 bước'}
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded bg-[#0F766E] text-white font-mono font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                {isJa
                  ? 'インストーラーをダウンロードして起動します（管理者権限不要）。'
                  : isEn
                  ? 'Download and launch the standalone installer (no Admin rights required).'
                  : `Tải bộ cài đặt và khởi chạy (${DESKTOP_RELEASE.sizeLabel}, không cần quyền Admin).`}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded bg-[#0F766E] text-white font-mono font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                {isJa
                  ? '新しい会議室を作成するか、共有された会議コードを入力して入室します。'
                  : isEn
                  ? 'Create a new meeting room or enter a shared room code to join.'
                  : 'Tạo phòng họp mới hoặc nhập mã phòng để kết nối với các thành viên.'}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded bg-[#0F766E] text-white font-mono font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                {isJa
                  ? '母国語で話すだけで、リアルタイム二言語字幕・音声通訳・議事録が自動生成されます。'
                  : isEn
                  ? 'Speak naturally in your native language with live bilingual subtitles and AI minutes.'
                  : 'Trò chuyện bằng tiếng mẹ đẻ với phụ đề song ngữ thời gian thực và biên bản tự động.'}
              </span>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="space-y-2.5">
          <a
            href={DESKTOP_RELEASE.downloadUrl}
            download={DESKTOP_RELEASE.fileName}
            onClick={() => setStarted(true)}
            className="w-full py-3 px-5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {isJa
                ? 'Windows版をダウンロード (.exe)'
                : isEn
                ? 'Download for Windows (.exe)'
                : 'Tải Xuống Bản Cài Đặt (.exe)'}
            </span>
            <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded ml-1">
              {DESKTOP_RELEASE.sizeLabel}
            </span>
          </a>

          {started && (
            <p role="status" className="text-xs text-[#0F766E] dark:text-teal-400 px-1 font-medium">
              {isJa
                ? 'ダウンロードを開始しました。完了後にファイルを実行してください。'
                : isEn
                ? 'Download started. Run the installer when it finishes.'
                : 'Đã bắt đầu tải. Khi hoàn tất, hãy mở tệp vừa tải để khởi chạy.'}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
            <span>Cài đặt User-space • Không cần quyền Admin</span>
            <a
              href="https://github.com/DuHieu/AI-Translate-Meeting/releases"
              target="_blank"
              rel="noreferrer"
              className="text-[#0F766E] dark:text-teal-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>GitHub Releases</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* SmartScreen micro-tip */}
          <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-[#11151C] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {isJa
                ? 'Windows SmartScreenが表示された場合は、「詳細情報」➔「実行」をクリックして開始してください。'
                : isEn
                ? 'If Windows SmartScreen appears, click "More info" ➔ "Run anyway" to complete setup.'
                : 'Nếu Windows SmartScreen hiển thị hộp thoại xác nhận, hãy bấm "More info" ➔ "Run anyway".'}{' '}
              <a
                href={DESKTOP_RELEASE.certificateUrl}
                download
                className="font-semibold text-[#0F766E] dark:text-teal-400 underline"
              >
                {isJa ? '証明書 (.cer)' : isEn ? 'Publisher certificate (.cer)' : 'Chứng chỉ nhà phát hành (.cer)'}
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
