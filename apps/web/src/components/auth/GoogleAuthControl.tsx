import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Loader2,
  LogOut,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context-def';
import { useLanguage } from '../../context/language-context-def';

const AUTH_LABELS = {
  vi: {
    signInGoogle: 'Đăng nhập',
    signInFull: 'Tiếp tục với Google',
    signInShort: 'Đăng nhập',
    signingIn: 'Đang kết nối...',
    switchAccount: 'Đổi tài khoản',
    signOut: 'Đăng xuất',
    greetingPrefix: 'Xin chào,',
    useIdentityHint: 'Đồng bộ tên hiển thị & lịch họp tức thì',
  },
  en: {
    signInGoogle: 'Sign in',
    signInFull: 'Continue with Google',
    signInShort: 'Sign in',
    signingIn: 'Connecting...',
    switchAccount: 'Switch account',
    signOut: 'Sign out',
    greetingPrefix: 'Hi,',
    useIdentityHint: 'Sync your display name & meeting schedule instantly',
  },
  ja: {
    signInGoogle: 'ログイン',
    signInFull: 'Googleで続行',
    signInShort: 'ログイン',
    signingIn: '接続中...',
    switchAccount: 'アカウント切替',
    signOut: 'ログアウト',
    greetingPrefix: 'こんにちは、',
    useIdentityHint: '表示名と会議スケジュールを即時同期',
  },
};

const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.35 12.2c0-.7-.06-1.2-.2-1.72H12v3.53h5.37a4.6 4.6 0 0 1-2 2.94l2.91 2.26c1.7-1.57 3.07-3.89 3.07-7.01Z"
    />
    <path
      fill="#34A853"
      d="M12 21.7c2.61 0 4.8-.86 6.4-2.34l-2.91-2.26c-.81.54-1.84.92-3.49.92-2.52 0-4.66-1.7-5.42-4l-3.01 2.33A9.67 9.67 0 0 0 12 21.7Z"
    />
    <path
      fill="#FBBC05"
      d="M6.58 14.02A5.8 5.8 0 0 1 6.28 12c0-.7.12-1.38.3-2.02L3.57 7.65A9.66 9.66 0 0 0 2.5 12c0 1.56.37 3.02 1.07 4.35l3.01-2.33Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.98c1.83 0 3.08.79 3.79 1.45l2.67-2.61A9.13 9.13 0 0 0 12 2.3a9.67 9.67 0 0 0-8.43 5.35l3.01 2.33c.76-2.3 2.9-4 5.42-4Z"
    />
  </svg>
);

interface GoogleAuthControlProps {
  variant?: 'navbar' | 'card' | 'prejoin';
  redirectPath?: string;
  onUserAuthenticated?: (fullName: string, email: string) => void;
}

export const GoogleAuthControl: React.FC<GoogleAuthControlProps> = ({
  variant = 'navbar',
  redirectPath,
  onUserAuthenticated,
}) => {
  const { language } = useLanguage();
  const labels = AUTH_LABELS[language] || AUTH_LABELS.vi;
  const { user, loading, signInWithGoogle, signOut, clearAuthError } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user && onUserAuthenticated) {
      onUserAuthenticated(user.fullName, user.email);
    }
  }, [user, onUserAuthenticated]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleTriggerLogin = async () => {
    clearAuthError();
    setSubmitting(true);
    try {
      await signInWithGoogle(redirectPath);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    setMenuOpen(false);
    await handleTriggerLogin();
  };

  // Google Meet-style compact top-right account popover
  const accountMenuPortal =
    menuOpen && user && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label={user.email}
            className="fixed top-14 right-4 z-[9999] w-72 rounded-2xl border border-zinc-200 dark:border-[#2c2c34] bg-white dark:bg-[#1b1b20] p-4 text-zinc-900 dark:text-zinc-100 shadow-2xl animate-in fade-in zoom-in-95 duration-120"
          >
            <div className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate pb-3">
              {user.email}
            </div>

            <div className="flex flex-col items-center pb-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-blue-500/30 mb-2"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white mb-2">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-full">
                {labels.greetingPrefix} {user.fullName}!
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleSwitchAccount()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-[#32323c] bg-zinc-50 hover:bg-zinc-100 dark:bg-[#23232a] dark:hover:bg-[#2b2b34] px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="truncate">{labels.switchAccount}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false);
                  await signOut();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-[#32323c] bg-zinc-50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 dark:bg-[#23232a] dark:hover:bg-red-500/15 dark:hover:text-red-400 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="truncate">{labels.signOut}</span>
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {/* ── Variant 1: Navbar Pill (Google Meet compact style) ── */}
      {variant === 'navbar' &&
        (user ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            data-testid="supabase-user-pill"
            className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-[#32323a] bg-white hover:bg-zinc-50 dark:bg-[#18181c] dark:hover:bg-[#222228] pl-1.5 pr-2.5 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer shadow-2xs"
            title={`${user.fullName} (${user.email})`}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-blue-500/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="max-w-[110px] truncate hidden sm:inline font-semibold">
              {user.fullName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:inline" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleTriggerLogin()}
            disabled={loading || submitting}
            data-testid="supabase-google-login-btn"
            className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-[#34343d] bg-white hover:bg-zinc-50 dark:bg-[#18181c] dark:hover:bg-[#222228] px-3.5 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer disabled:opacity-60 shadow-2xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <GoogleLogoSvg className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{labels.signInGoogle}</span>
          </button>
        ))}

      {/* ── Variant 2: Mobile / Drawer Card ── */}
      {variant === 'card' && (
        <div className="bg-white dark:bg-[#14151a] rounded-2xl p-3 border border-zinc-200/70 dark:border-white/[0.06]">
          {user ? (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-blue-500/30 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{labels.signOut}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleTriggerLogin()}
              disabled={submitting}
              className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-zinc-50 dark:bg-[#1e1e26] dark:hover:bg-[#262630] border border-zinc-200 dark:border-[#32323e] text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <GoogleLogoSvg className="w-4 h-4" />
              )}
              <span>{submitting ? labels.signingIn : labels.signInFull}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Variant 3: PreJoin Clean Compact Row ── */}
      {variant === 'prejoin' &&
        (user ? (
          <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] dark:bg-emerald-500/10 px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {user.fullName}
                </span>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => void handleTriggerLogin()}
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded-lg cursor-pointer"
              >
                {labels.switchAccount}
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-2 py-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {labels.signOut}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleTriggerLogin()}
            disabled={submitting}
            data-testid="prejoin-google-login-btn"
            className="w-full py-2.5 px-3.5 rounded-xl bg-white hover:bg-zinc-50 dark:bg-[#1e1e26] dark:hover:bg-[#262630] border border-zinc-300 dark:border-[#343442] text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
            ) : (
              <GoogleLogoSvg className="w-4 h-4 shrink-0" />
            )}
            <span>{submitting ? labels.signingIn : labels.signInFull}</span>
          </button>
        ))}

      {accountMenuPortal}
    </>
  );
};
