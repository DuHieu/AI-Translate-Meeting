import { createContext, useContext } from 'react';
import { AppLanguage, TranslationDictionary } from '../i18n';

export interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: TranslationDictionary;
}

export const LANGUAGE_STORAGE_KEY = 'layameet_lang';

/**
 * Intelligent automatic language detection based on user location (timezone) & browser locale
 */
export function detectUserLanguage(): AppLanguage {
  // 1. Check LocalStorage if user previously chose a language
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null;
  if (saved && (saved === 'vi' || saved === 'en' || saved === 'ja')) {
    return saved;
  }

  // 2. Check Browser Timezone (Geo-location estimation with 0ms network latency)
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timeZone.includes('Tokyo') || timeZone.includes('Japan')) {
      return 'ja';
    }
    if (timeZone.includes('Ho_Chi_Minh') || timeZone.includes('Saigon') || timeZone.includes('Hanoi')) {
      return 'vi';
    }
  } catch {
    // Ignore timezone error and proceed to navigator language
  }

  // 3. Check Browser Languages (navigator.languages)
  const browserLangs = navigator.languages || [navigator.language || ''];
  for (const lang of browserLangs) {
    const lower = lang.toLowerCase();
    if (lower.startsWith('vi')) return 'vi';
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('en')) return 'en';
  }

  // 4. Default international fallback: English
  return 'en';
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
