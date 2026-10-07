import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'layameet:supabase-config';
export const POST_AUTH_REDIRECT_KEY = 'layameet:post-auth-redirect';
export const GOOGLE_AUTH_NONCE_KEY = 'layameet:google-auth-nonce';

export const DEFAULT_SUPABASE_URL = 'https://aonorpluxgrohckdirto.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_SRv4t4IdBFI6GNRehT4t3g_Az90BQr3';
export const DEFAULT_GOOGLE_CLIENT_ID =
  '778439472845-cso2dfrnc6ddjcvd2c6rff5si29jh1r2.apps.googleusercontent.com';

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
  googleClientId?: string;
}

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

export interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
  getDismissedReason?: () => string;
}

export interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    ux_mode?: 'popup' | 'redirect';
    use_fedcm_for_prompt?: boolean;
    itp_support?: boolean;
    context?: 'signin' | 'signup' | 'use';
  }) => void;
  prompt: (momentListener?: (notification: GooglePromptNotification) => void) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number | string;
      locale?: string;
    },
  ) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

/**
 * Security guard per Supabase best practices:
 * Never allow service_role or secret keys to be used in browser clients.
 */
export function isUnsafeSecretKey(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('sb_secret_')) return true;

  // Check if JWT payload contains role: "service_role"
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson) as { role?: string };
      if (payload.role === 'service_role') {
        return true;
      }
    } catch {
      // Not a standard base64 JWT payload
    }
  }
  return false;
}

export function getGoogleClientId(): string {
  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';
  if (envClientId) return envClientId;

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SupabaseRuntimeConfig>;
        if (parsed.googleClientId?.trim()) {
          return parsed.googleClientId.trim();
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }

  return DEFAULT_GOOGLE_CLIENT_ID;
}

export async function generateNoncePair(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const randomBytes = new Uint8Array(24);
  window.crypto.getRandomValues(randomBytes);
  const rawNonce = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const encoded = new TextEncoder().encode(rawNonce);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  const hashedNonce = Array.from(new Uint8Array(hashBuffer), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  return { rawNonce, hashedNonce };
}

let gsiScriptPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browser environment required'));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gsiScriptPromise) {
    return gsiScriptPromise;
  }

  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => {
          gsiScriptPromise = null;
          reject(new Error('Không thể tải Google Identity Services SDK.'));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScriptPromise = null;
      reject(new Error('Không thể tải Google Identity Services SDK.'));
    };
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

export function getSupabaseConfig(): SupabaseRuntimeConfig | null {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const envKey =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
    '';

  if (envUrl && envKey && !isUnsafeSecretKey(envKey)) {
    return { url: envUrl, anonKey: envKey, googleClientId: getGoogleClientId() };
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SupabaseRuntimeConfig>;
        const url = parsed.url?.trim() || '';
        const anonKey = parsed.anonKey?.trim() || '';
        if (url && anonKey && !isUnsafeSecretKey(anonKey)) {
          return {
            url,
            anonKey,
            googleClientId: parsed.googleClientId?.trim() || getGoogleClientId(),
          };
        }
      }
    } catch {
      // Ignore localStorage parse error
    }
  }

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
    googleClientId: getGoogleClientId(),
  };
}

export function saveSupabaseRuntimeConfig(config: SupabaseRuntimeConfig): void {
  const url = config.url.trim().replace(/\/+$/, '');
  const anonKey = config.anonKey.trim();

  if (
    !url.startsWith('https://') &&
    !url.startsWith('http://localhost') &&
    !url.startsWith('http://127.0.0.1')
  ) {
    throw new Error('Supabase URL phải bắt đầu bằng https:// (hoặc http://localhost khi dev).');
  }
  if (isUnsafeSecretKey(anonKey)) {
    throw new Error(
      'Bảo mật: Không được sử dụng service_role hoặc secret key trên trình duyệt. Hãy dùng anon / publishable key.',
    );
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      url,
      anonKey,
      googleClientId: config.googleClientId?.trim() || getGoogleClientId(),
    }),
  );
  cachedClient = null;
  cachedConfigKey = '';
}

export function clearSupabaseRuntimeConfig(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  cachedClient = null;
  cachedConfigKey = '';
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;

  const key = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'layameet-supabase-auth-token',
    },
  });
  cachedConfigKey = key;
  return cachedClient;
}
