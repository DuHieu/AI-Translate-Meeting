import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { SupabaseRuntimeConfig } from '../lib/supabaseClient';

export interface AuthUserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  provider: string;
}

export interface AuthContextValue {
  user: AuthUserProfile | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  authError: string | null;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateRuntimeConfig: (config: SupabaseRuntimeConfig) => void;
  resetRuntimeConfig: () => void;
  clearAuthError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
