import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  getSupabaseClient,
  GOOGLE_AUTH_NONCE_KEY,
  POST_AUTH_REDIRECT_KEY,
} from '../lib/supabaseClient';
import { LayaMeetLogo } from '../components/common/LayaMeetLogo';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;

    const completeOAuth = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (active) {
          setErrorMsg('Chưa cấu hình Supabase URL và Publishable/Anon Key.');
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errorDescription =
        params.get('error_description') ||
        params.get('error') ||
        hashParams.get('error_description') ||
        hashParams.get('error');
      if (errorDescription) {
        if (active) {
          setErrorMsg(decodeURIComponent(errorDescription));
        }
        return;
      }

      const code = params.get('code');
      const idToken = hashParams.get('id_token') || params.get('id_token');
      try {
        if (idToken) {
          const savedNonce = window.sessionStorage.getItem(GOOGLE_AUTH_NONCE_KEY) || undefined;
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
            ...(savedNonce ? { nonce: savedNonce } : {}),
          });
          if (error) {
            throw error;
          }
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        } else {
          const { error } = await supabase.auth.getSession();
          if (error) {
            throw error;
          }
        }

        if (!active) return;
        setCompleted(true);

        let redirectTarget = '/';
        try {
          const saved = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
          if (saved && saved.startsWith('/') && !saved.startsWith('/auth/callback')) {
            redirectTarget = saved;
          }
          window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
        } catch {
          // Ignore storage error
        }

        window.setTimeout(() => {
          if (active) {
            navigate(redirectTarget, { replace: true });
          }
        }, 450);
      } catch (err: unknown) {
        if (!active) return;
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Không thể hoàn tất xác thực Google với Supabase.',
        );
      }
    };

    void completeOAuth();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-[#0f0f10] text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-[#2a2a30] bg-white dark:bg-[#16161b] p-6 shadow-xl text-center space-y-4">
        <div className="flex justify-center">
          <LayaMeetLogo size="md" />
        </div>

        {errorMsg ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Đăng nhập Google chưa hoàn tất
              </h1>
              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Quay lại trang chủ
            </button>
          </div>
        ) : completed ? (
          <div className="space-y-3 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Đăng nhập Google thành công!
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Đang chuyển hướng bạn quay lại phòng họp...
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Đang xác thực tài khoản Google...
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Đồng bộ phiên đăng nhập an toàn qua Supabase Auth
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
