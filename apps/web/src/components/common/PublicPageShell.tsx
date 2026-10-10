import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  X,
  Home,
  Calendar,
  Clock,
  Sparkles,
  CreditCard,
  HelpCircle,
  Phone,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react';
import { LayaMeetLogo } from './LayaMeetLogo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GoogleAuthControl } from '../auth/GoogleAuthControl';
import { NeuralLinguisticBackground } from './NeuralLinguisticBackground';
import { BreadcrumbItem } from './Breadcrumb';
import { LegalModal } from './LegalModal';
import { useLanguage } from '../../context/language-context-def';
import { useAuth } from '../../context/auth-context-def';
import { AppLanguage } from '../../i18n';

const SHELL_COPY: Record<string, Record<string, string>> = {
  vi: {
    home: 'Trang chủ',
    pricing: 'Bảng giá',
    features: 'Tính năng',
    faq: 'Hỏi đáp',
    contact: 'Tư vấn',
    calendarNav: 'Lịch cuộc họp',
    historyNav: 'Lịch sử cuộc họp',
    settingsNav: 'Cài đặt & Giao diện',
    navDrawerTitle: 'Menu điều hướng LayaMeet',
    closeDrawer: 'Đóng',
    minimalFooterBadge: '100% RAM-Only · Zero Raw Audio',
    privacyLink: 'Chính sách quyền riêng tư',
    termsLink: 'Điều khoản dịch vụ',
    signOut: 'Đăng xuất',
  },
  en: {
    home: 'Home',
    pricing: 'Pricing',
    features: 'Features',
    faq: 'FAQ',
    contact: 'Contact',
    calendarNav: 'Meeting Calendar',
    historyNav: 'Meeting History',
    settingsNav: 'Settings & Appearance',
    navDrawerTitle: 'LayaMeet Navigation Menu',
    closeDrawer: 'Close',
    minimalFooterBadge: '100% RAM-Only · Zero Raw Audio',
    privacyLink: 'Privacy Policy',
    termsLink: 'Terms of Service',
    signOut: 'Sign out',
  },
  ja: {
    home: 'ホーム',
    pricing: '料金プラン',
    features: '機能一覧',
    faq: 'よくある質問',
    contact: 'お問い合わせ',
    calendarNav: '会議カレンダー',
    historyNav: '会議の履歴',
    settingsNav: '設定・外観',
    navDrawerTitle: 'LayaMeet ナビゲーションメニュー',
    closeDrawer: '閉じる',
    minimalFooterBadge: '完全RAMメモリ処理 · 音声保存なし',
    privacyLink: 'プライバシーポリシー',
    termsLink: '利用規約',
    signOut: 'ログアウト',
  },
};

export interface PublicPageShellProps {
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  forcedLanguage?: AppLanguage;
  activeDrawerId?: 'home' | 'features' | 'pricing' | 'faq' | 'contact' | 'settings' | 'calendar' | 'history';
}

export const PublicPageShell: React.FC<PublicPageShellProps> = ({
  breadcrumbs,
  children,
  forcedLanguage,
  activeDrawerId,
}) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const copy = SHELL_COPY[language] || SHELL_COPY.vi;

  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  // Sync forcedLanguage if provided
  useEffect(() => {
    if (forcedLanguage && language !== forcedLanguage) {
      setLanguage(forcedLanguage);
    }
  }, [forcedLanguage, language, setLanguage]);

  // Keyboard navigation & drawer dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNavDrawerOpen) setIsNavDrawerOpen(false);
        if (legalModalType) setLegalModalType(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNavDrawerOpen, legalModalType]);

  const handleSelectDrawerItem = (id: string) => {
    setIsNavDrawerOpen(false);
    switch (id) {
      case 'home':
        navigate('/');
        break;
      case 'features':
        navigate('/features');
        break;
      case 'pricing':
        navigate('/pricing');
        break;
      case 'faq':
        navigate('/faq');
        break;
      case 'contact':
        navigate('/contact');
        break;
      case 'developers':
        navigate('/developers');
        break;
      case 'settings':
        navigate('/settings?tab=subtitles');
        break;
      case 'tools':
        navigate('/settings?tab=ai_byok');
        break;
      case 'calendar':
        navigate('/calendar');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'privacy':
        setLegalModalType('privacy');
        break;
      case 'terms':
        setLegalModalType('terms');
        break;
      default:
        break;
    }
  };

  // Ensure document.body can always scroll naturally on dedicated pages
  useEffect(() => {
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="content-page relative min-h-dvh bg-zinc-50 dark:bg-[#0f0f10] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors overflow-x-hidden">
      {/* ── Neural Linguistic Ambient Background ── */}
      <NeuralLinguisticBackground />

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-0 right-0 w-full h-[600px] ambient-hero-glow" />
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl" />
      </div>

      {/* ── Top Header Bar (Desktop & Mobile) ── */}
      <header className="sticky top-0 z-40 h-14 w-full bg-white/90 dark:bg-[#0f0f10]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-[#272832]/80 shadow-2xs">
        <div className="max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
          {/* Left: Hamburger & Brand Logo & Header Inline Breadcrumbs (Vercel / GitHub style) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              data-testid="header-logo-menu-btn"
              aria-label={copy.navDrawerTitle}
              title={copy.navDrawerTitle}
              className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link
              to="/"
              className="flex items-center hover:opacity-90 transition-opacity shrink-0"
            >
              <LayaMeetLogo size="md" />
            </Link>

            {/* Inline Header Breadcrumb: 0 vertical space wasted */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0 animate-in fade-in duration-200">
                <span className="text-zinc-300 dark:text-zinc-700 font-light select-none text-sm shrink-0" aria-hidden="true">
                  /
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px] sm:max-w-[240px] md:max-w-[360px] text-xs sm:text-[13px] tracking-tight">
                  {breadcrumbs[breadcrumbs.length - 1].label}
                </span>
              </div>
            )}
          </div>

          {/* Right: Shortcuts + Language + Theme + Auth */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden lg:flex items-center gap-1 pr-1 border-r border-zinc-200/80 dark:border-[#2e2e30]/80">
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                title={copy.calendarNav}
                aria-label={copy.calendarNav}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                title={copy.historyNav}
                aria-label={copy.historyNav}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                title={copy.settingsNav}
                aria-label={copy.settingsNav}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <LanguageSwitcher />
            <ThemeToggle />
            <GoogleAuthControl variant="navbar" />
          </div>
        </div>
      </header>

      {/* ── Main Content Area (Natural Window Scroll) ── */}
      <main className="relative z-10 flex-1 w-full">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-zinc-200/80 dark:border-[#222327] bg-white/75 dark:bg-[#0c0c0e]/75 backdrop-blur-md px-4 sm:px-6 lg:px-12 py-4 flex flex-wrap gap-4 items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
        <div className="flex items-center gap-3">
          <span>{t.footer.copyright}</span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{copy.minimalFooterBadge}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => setLegalModalType('privacy')}
            className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            {copy.privacyLink}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setLegalModalType('terms')}
            className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            {copy.termsLink}
          </button>
          <span>•</span>
          <Link
            to="/cam-nang"
            className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            {t.footer.guides}
          </Link>
        </div>
      </footer>

      {/* ── Navigation Drawer Modal ── */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsNavDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={copy.navDrawerTitle}
            className="relative z-10 w-full max-w-[280px] h-full bg-white dark:bg-[#141519] border-r border-zinc-200 dark:border-[#272832] p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-[#272832]">
                <LayaMeetLogo size="md" />
                <button
                  type="button"
                  onClick={() => setIsNavDrawerOpen(false)}
                  data-testid="nav-drawer-close-btn"
                  aria-label={copy.closeDrawer}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('home')}
                  data-testid="drawer-home"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeDrawerId === 'home'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Home className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{copy.home}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('calendar')}
                  data-testid="drawer-calendar"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeDrawerId === 'calendar'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{copy.calendarNav}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('history')}
                  data-testid="drawer-history"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeDrawerId === 'history'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{copy.historyNav}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('features')}
                  data-testid="drawer-features"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeDrawerId === 'features'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{copy.features}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('pricing')}
                  data-testid="drawer-pricing"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeDrawerId === 'pricing'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{copy.pricing}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('faq')}
                  data-testid="drawer-faq"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeDrawerId === 'faq'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{copy.faq}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('contact')}
                  data-testid="drawer-contact"
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer text-left ${
                    activeDrawerId === 'contact'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Phone className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{copy.contact}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('settings')}
                  data-testid="drawer-settings"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{copy.settingsNav}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectDrawerItem('tools')}
                  data-testid="drawer-tools"
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
                >
                  <Zap className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>{language === 'ja' ? 'AI・APIキー設定' : language === 'en' ? 'AI & API Key Settings' : 'Cài đặt AI & API Key'}</span>
                </button>
              </nav>
            </div>

            {user?.email && (
              <div className="pt-3 border-t border-zinc-200/80 dark:border-[#272832] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.fullName || user.email.split('@')[0]}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsNavDrawerOpen(false);
                    await signOut();
                  }}
                  title={copy.signOut}
                  aria-label={copy.signOut}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ── Modals ── */}
      {legalModalType && (
        <LegalModal
          isOpen={Boolean(legalModalType)}
          type={legalModalType}
          onClose={() => setLegalModalType(null)}
        />
      )}
    </div>
  );
};
