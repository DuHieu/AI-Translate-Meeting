import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Check, Settings2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { getStoredCookieConsent, updateAnalyticsConsent, type CookieConsentStatus } from '../../lib/analytics';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);

  useEffect(() => {
    // Check if user has already made a choice
    const stored = getStoredCookieConsent();
    if (stored === null) {
      // Delay slightly for smooth non-intrusive entrance
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for manual reopen requests from footer or settings
  useEffect(() => {
    const handleReopen = () => {
      const current = getStoredCookieConsent();
      setAnalyticsAllowed(current === 'granted');
      setShowPreferences(true);
      setIsVisible(true);
    };

    window.addEventListener('layameet:open-cookie-settings', handleReopen);
    return () => window.removeEventListener('layameet:open-cookie-settings', handleReopen);
  }, []);

  const handleAcceptAll = () => {
    updateAnalyticsConsent('granted');
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    updateAnalyticsConsent('denied');
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    const status: CookieConsentStatus = analyticsAllowed ? 'granted' : 'denied';
    updateAnalyticsConsent(status);
    setIsVisible(false);
  };

  const handleOpenPrivacy = () => {
    window.dispatchEvent(new CustomEvent('layameet:open-privacy-modal'));
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Thông báo quản lý cookie"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2e2e32] rounded-2xl shadow-2xl p-5 sm:p-6 backdrop-blur-md text-zinc-900 dark:text-zinc-100 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Quyền Riêng Tư &amp; Cookie</h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                RAM-only
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              LayaMeet sử dụng cookie thiết yếu cho phiên họp trực tuyến và công cụ phân tích ẩn danh (Google Analytics 4) nhằm tối ưu độ trễ dịch thuật. Chúng tôi tuyệt đối <strong>không lưu trữ âm thanh cuộc họp</strong> xuống ổ đĩa.
            </p>
          </div>
        </div>

        {/* Preferences Accordion */}
        {showPreferences && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 space-y-3 text-xs">
            {/* Category 1: Essential */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Cookie Thiết Yếu</span>
                  <span className="text-[10px] text-zinc-400 font-normal">(Bắt buộc)</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Duy trì phiên kết nối WebRTC phòng họp, mã hóa JWT và tùy chọn giao diện.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                Luôn bật
              </span>
            </div>

            <div className="border-t border-zinc-200/80 dark:border-zinc-800" />

            {/* Category 2: Analytics */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span>Phân Tích &amp; Hiệu Năng (GA4)</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Đo lường thời gian tải trang và Core Web Vitals ẩn danh để tối ưu trải nghiệm.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={analyticsAllowed}
                  onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>{showPreferences ? 'Thu gọn' : 'Tùy chỉnh'}</span>
              {showPreferences ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <button
              type="button"
              onClick={handleOpenPrivacy}
              className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Chính sách
            </button>
          </div>

          <div className="flex items-center gap-2">
            {showPreferences ? (
              <button
                type="button"
                onClick={handleSavePreferences}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
              >
                Lưu tùy chọn
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDeclineAll}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Chấp nhận tất cả</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
