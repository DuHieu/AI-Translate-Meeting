import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Cookie, ShieldCheck, Check, Settings2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { getStoredCookieConsent, updateAnalyticsConsent, type CookieConsentStatus } from '../../lib/analytics';
import { useLanguage } from '../../context/language-context-def';

export const CookieConsentBanner: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);

  const isMeetingFlowRoute =
    location.pathname.startsWith('/prejoin') ||
    location.pathname.startsWith('/join') ||
    location.pathname.startsWith('/meeting');

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
      setManualOpen(true);
      setIsVisible(true);
    };

    window.addEventListener('layameet:open-cookie-settings', handleReopen);
    return () => window.removeEventListener('layameet:open-cookie-settings', handleReopen);
  }, []);

  const handleAcceptAll = () => {
    updateAnalyticsConsent('granted');
    setManualOpen(false);
    setIsVisible(false);
  };

  const handleDeclineAll = () => {
    updateAnalyticsConsent('denied');
    setManualOpen(false);
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    const status: CookieConsentStatus = analyticsAllowed ? 'granted' : 'denied';
    updateAnalyticsConsent(status);
    setManualOpen(false);
    setIsVisible(false);
  };

  const handleOpenPrivacy = () => {
    window.dispatchEvent(new CustomEvent('layameet:open-privacy-modal'));
  };

  const { language } = useLanguage();

  const tCookie = {
    vi: {
      title: 'Quyền Riêng Tư & Cookie',
      ramBadge: 'RAM-only',
      descDesktop: 'LayaMeet sử dụng cookie thiết yếu cho phiên họp trực tuyến và công cụ phân tích ẩn danh (Google Analytics 4) nhằm tối ưu độ trễ dịch thuật. Chúng tôi tuyệt đối không lưu trữ âm thanh cuộc họp xuống ổ đĩa.',
      descMobile: 'Cookie thiết yếu cho phòng họp · Không lưu âm thanh xuống đĩa.',
      essential: 'Cookie Thiết Yếu',
      required: '(Bắt buộc)',
      essentialDesc: 'Duy trì phiên kết nối WebRTC phòng họp, mã hóa JWT và tùy chọn giao diện.',
      alwaysOn: 'Luôn bật',
      analytics: 'Phân Tích & Hiệu Năng (GA4)',
      analyticsDesc: 'Đo lường thời gian tải trang và Core Web Vitals ẩn danh để tối ưu trải nghiệm.',
      collapse: 'Thu gọn',
      customize: 'Tùy chỉnh',
      policy: 'Chính sách',
      save: 'Lưu tùy chọn',
      decline: 'Từ chối',
      acceptAll: 'Chấp nhận tất cả',
      acceptShort: 'Đồng ý',
    },
    en: {
      title: 'Privacy & Cookies',
      ramBadge: 'RAM-only',
      descDesktop: 'LayaMeet uses essential cookies for real-time meetings and privacy-preserving analytics (Google Analytics 4) to monitor translation latency. We never store raw meeting audio on disk.',
      descMobile: 'Essential meeting cookies · Zero raw audio on disk.',
      essential: 'Essential Cookies',
      required: '(Required)',
      essentialDesc: 'Maintains WebRTC room connections, JWT security tokens, and theme settings.',
      alwaysOn: 'Always on',
      analytics: 'Performance & Analytics (GA4)',
      analyticsDesc: 'Anonymous measurement of page speed and Core Web Vitals to optimize UX.',
      collapse: 'Collapse',
      customize: 'Customize',
      policy: 'Privacy Policy',
      save: 'Save preferences',
      decline: 'Decline',
      acceptAll: 'Accept all',
      acceptShort: 'Accept',
    },
    ja: {
      title: 'プライバシーとクッキー',
      ramBadge: 'RAM-only',
      descDesktop: 'LayaMeetはオンライン会議の通信維持および匿名分析（Google Analytics 4）のためにクッキーを使用します。音声データはディスクに一切保存されません。',
      descMobile: '会議維持用クッキー · 音声のディスク保存なし。',
      essential: '必須クッキー',
      required: '(必須)',
      essentialDesc: 'WebRTC接続セッション、JWT認証トークン、画面設定の保持。',
      alwaysOn: '常時有効',
      analytics: '分析とパフォーマンス (GA4)',
      analyticsDesc: '表示速度とCore Web Vitalsの匿名計測による品質最適化。',
      collapse: '閉じる',
      customize: '設定',
      policy: 'プライバシー規約',
      save: '設定を保存',
      decline: '拒否',
      acceptAll: 'すべて同意',
      acceptShort: '同意',
    },
  }[language] || {
    title: 'Privacy & Cookies',
    ramBadge: 'RAM-only',
    descDesktop: 'LayaMeet uses essential cookies for real-time meetings and privacy-preserving analytics (Google Analytics 4) to monitor translation latency. We never store raw meeting audio on disk.',
    descMobile: 'Essential meeting cookies · Zero raw audio on disk.',
    essential: 'Essential Cookies',
    required: '(Required)',
    essentialDesc: 'Maintains WebRTC room connections, JWT security tokens, and theme settings.',
    alwaysOn: 'Always on',
    analytics: 'Performance & Analytics (GA4)',
    analyticsDesc: 'Anonymous measurement of page speed and Core Web Vitals to optimize UX.',
    collapse: 'Collapse',
    customize: 'Customize',
    policy: 'Privacy Policy',
    save: 'Save preferences',
    decline: 'Decline',
    acceptAll: 'Accept all',
    acceptShort: 'Accept',
  };

  if (!isVisible || (isMeetingFlowRoute && !manualOpen)) return null;

  return (
    <div
      role="region"
      aria-label={tCookie.title}
      className={`cookie-consent fixed bottom-2.5 left-2.5 right-2.5 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-300`}
    >
      <div className="bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200 dark:border-[#2e2e32] rounded-2xl shadow-2xl p-3 sm:p-5 backdrop-blur-md text-zinc-900 dark:text-zinc-100 space-y-2.5 sm:space-y-4">
        {/* Header */}
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Cookie className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight">{tCookie.title}</h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                {tCookie.ramBadge}
              </span>
            </div>
            <p className="hidden sm:block mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {tCookie.descDesktop}
            </p>
            <p className="sm:hidden mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 truncate">
              {tCookie.descMobile}
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
                  <Lock className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                  <span>{tCookie.essential}</span>
                  <span className="text-[10px] text-zinc-400 font-normal">{tCookie.required}</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                  {tCookie.essentialDesc}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                {tCookie.alwaysOn}
              </span>
            </div>

            <div className="border-t border-zinc-200/80 dark:border-zinc-800" />

            {/* Category 2: Analytics */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span>{tCookie.analytics}</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                  {tCookie.analyticsDesc}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  aria-label={tCookie.analytics}
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
        <div className="flex items-center justify-between gap-2 pt-0.5 sm:pt-1">
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>{showPreferences ? tCookie.collapse : tCookie.customize}</span>
              {showPreferences ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <button
              type="button"
              onClick={handleOpenPrivacy}
              className="text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 underline underline-offset-2 transition-colors cursor-pointer"
            >
              {tCookie.policy}
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {showPreferences ? (
              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
              >
                {tCookie.save}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDeclineAll}
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer"
                >
                  {tCookie.decline}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tCookie.acceptAll}</span>
                  <span className="sm:hidden">{tCookie.acceptShort}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
