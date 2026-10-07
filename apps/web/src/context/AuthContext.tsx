import { AdaptiveDialog } from '../components/common/AdaptiveDialog';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session, User } from '@supabase/supabase-js';
import { Loader2, X } from 'lucide-react';
import {
  clearSupabaseRuntimeConfig,
  generateNoncePair,
  getGoogleClientId,
  getSupabaseClient,
  getSupabaseConfig,
  GOOGLE_AUTH_NONCE_KEY,
  GoogleCredentialResponse,
  loadGoogleIdentityScript,
  POST_AUTH_REDIRECT_KEY,
  saveSupabaseRuntimeConfig,
  SupabaseRuntimeConfig,
} from '../lib/supabaseClient';
import { AuthContext, AuthContextValue, AuthUserProfile } from './auth-context-def';

function mapSupabaseUser(rawUser: User | null | undefined): AuthUserProfile | null {
  if (!rawUser) return null;
  const meta = rawUser.user_metadata ?? {};
  const email = rawUser.email || (typeof meta.email === 'string' ? meta.email : '');
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (email ? email.split('@')[0] : 'LayaMeet User');
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
    (typeof meta.picture === 'string' && meta.picture.trim()) ||
    null;
  const provider =
    (typeof rawUser.app_metadata?.provider === 'string' && rawUser.app_metadata.provider) ||
    'google';

  return {
    id: rawUser.id,
    email,
    fullName,
    avatarUrl,
    provider,
  };
}

function doesJwtIncludeNonce(jwtToken: string): boolean {
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return false;
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { nonce?: string };
    return Boolean(payload.nonce);
  } catch {
    return false;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configVersion, setConfigVersion] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Fallback compact Google button popover ONLY when browser suppresses One Tap
  const [fallbackPopoverOpen, setFallbackPopoverOpen] = useState(false);
  const [gisVerifying, setGisVerifying] = useState(false);
  const gsiButtonRef = useRef<HTMLDivElement | null>(null);
  const rawNonceRef = useRef<string>('');
  const hashedNonceRef = useRef<string>('');
  const gisInitializedRef = useRef<boolean>(false);
  const autoPromptedRef = useRef<boolean>(false);

  const isConfigured = Boolean(configVersion >= 0 && getSupabaseConfig());

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    const supabase = getSupabaseClient();
    if (!supabase || !response?.credential) {
      setAuthError('Không nhận được thông tin xác thực từ Google.');
      return;
    }

    setGisVerifying(true);
    setAuthError(null);

    try {
      const nonceToVerify =
        rawNonceRef.current ||
        (typeof window !== 'undefined'
          ? window.sessionStorage.getItem(GOOGLE_AUTH_NONCE_KEY) || ''
          : '');
      const includeNonce = Boolean(nonceToVerify && doesJwtIncludeNonce(response.credential));

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        ...(includeNonce ? { nonce: nonceToVerify } : {}),
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSession(data.session);
        setUser(mapSupabaseUser(data.session.user));
      }
      setFallbackPopoverOpen(false);
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Không thể đồng bộ tài khoản Google với LayaMeet.',
      );
    } finally {
      setGisVerifying(false);
    }
  }, []);

  const ensureGoogleIdentityReady = useCallback(async () => {
    const googleClientId = getGoogleClientId();
    if (!googleClientId) return null;

    if (!rawNonceRef.current || !hashedNonceRef.current) {
      const { rawNonce, hashedNonce } = await generateNoncePair();
      rawNonceRef.current = rawNonce;
      hashedNonceRef.current = hashedNonce;
      try {
        window.sessionStorage.setItem(GOOGLE_AUTH_NONCE_KEY, rawNonce);
      } catch {
        // Ignore sessionStorage error
      }
    }

    await loadGoogleIdentityScript();
    const googleId = window.google?.accounts?.id;
    if (!googleId) return null;

    if (!gisInitializedRef.current) {
      googleId.initialize({
        client_id: googleClientId,
        callback: (res) => {
          void handleGoogleCredential(res);
        },
        nonce: hashedNonceRef.current,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        use_fedcm_for_prompt: true,
        itp_support: true,
        context: 'signin',
      });
      gisInitializedRef.current = true;
    }

    return googleId;
  }, [handleGoogleCredential]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    setLoading(true);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
        }
        const currentSession = data.session ?? null;
        setSession(currentSession);
        setUser(mapSupabaseUser(currentSession?.user));
        setLoading(false);

        // Preload GIS & show Google Meet-style top-right One Tap if not logged in
        if (!currentSession && !autoPromptedRef.current) {
          autoPromptedRef.current = true;
          void ensureGoogleIdentityReady().then((googleId) => {
            if (mounted && googleId) {
              googleId.prompt();
            }
          });
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setAuthError(err instanceof Error ? err.message : 'Không thể kiểm tra phiên đăng nhập.');
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      const mapped = mapSupabaseUser(nextSession?.user);
      setUser(mapped);
      if (mapped?.fullName) {
        try {
          window.localStorage.setItem('layameet:last-display-name', mapped.fullName);
        } catch {
          // Ignore storage quota errors
        }
      }
      if (mapped) {
        setFallbackPopoverOpen(false);
        setGisVerifying(false);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configVersion, ensureGoogleIdentityReady]);

  // Render the official Google button inside the compact fallback popover when needed
  useEffect(() => {
    if (!fallbackPopoverOpen) return undefined;
    let cancelled = false;

    void ensureGoogleIdentityReady().then((googleId) => {
      if (cancelled || !googleId || !gsiButtonRef.current) return;
      gsiButtonRef.current.innerHTML = '';
      googleId.renderButton(gsiButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 280,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackPopoverOpen, ensureGoogleIdentityReady]);

  const signInWithGoogle = useCallback(
    async (redirectPath?: string) => {
      setAuthError(null);
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error('SUPABASE_NOT_CONFIGURED');
      }

      try {
        const targetPath =
          redirectPath || `${window.location.pathname}${window.location.search}`;
        window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, targetPath);
      } catch {
        // Ignore sessionStorage errors
      }

      // Regenerate fresh nonce for new login attempt
      gisInitializedRef.current = false;
      rawNonceRef.current = '';
      hashedNonceRef.current = '';

      const googleId = await ensureGoogleIdentityReady();
      if (googleId) {
        // Trigger native top-right Google One Tap / FedCM immediately without any center modal!
        // Only open the compact top-right fallback button if One Tap is suppressed by the browser.
        googleId.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setFallbackPopoverOpen(true);
          }
        });
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        throw error;
      }
    },
    [ensureGoogleIdentityReady],
  );

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      window.google?.accounts?.id?.cancel();
    } catch {
      // Ignore GIS cancel errors
    }
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    gisInitializedRef.current = false;
    rawNonceRef.current = '';
    hashedNonceRef.current = '';
  }, []);

  const updateRuntimeConfig = useCallback((config: SupabaseRuntimeConfig) => {
    setAuthError(null);
    saveSupabaseRuntimeConfig(config);
    setConfigVersion((v) => v + 1);
  }, []);

  const resetRuntimeConfig = useCallback(() => {
    clearSupabaseRuntimeConfig();
    setSession(null);
    setUser(null);
    setConfigVersion((v) => v + 1);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isConfigured,
      authError,
      signInWithGoogle,
      signOut,
      updateRuntimeConfig,
      resetRuntimeConfig,
      clearAuthError,
    }),
    [
      user,
      session,
      loading,
      isConfigured,
      authError,
      signInWithGoogle,
      signOut,
      updateRuntimeConfig,
      resetRuntimeConfig,
      clearAuthError,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {(fallbackPopoverOpen || gisVerifying) &&
        typeof document !== 'undefined' &&
        createPortal(
          <AdaptiveDialog label="Chọn tài khoản Google" onClose={() => { if (!gisVerifying) setFallbackPopoverOpen(false); }} className="auth-account-dialog">
          <div className="rounded-2xl border border-zinc-200 dark:border-[#2c2c34] bg-white dark:bg-[#18181d] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 pb-3">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                Chọn tài khoản Google
              </span>
              {!gisVerifying && (
                <button
                  type="button"
                  onClick={() => setFallbackPopoverOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#232329] cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {gisVerifying ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang đăng nhập...</span>
              </div>
            ) : (
              <div ref={gsiButtonRef} className="flex justify-center min-h-[42px]" />
            )}

            {authError && (
              <p className="mt-2.5 text-[11px] text-red-600 dark:text-red-400">
                {authError}
              </p>
            )}
          </div>
          </AdaptiveDialog>,
          document.body,
        )}
    </AuthContext.Provider>
  );
};
