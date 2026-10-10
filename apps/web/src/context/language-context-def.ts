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
const SUPPORTED_APP_LANGUAGES: AppLanguage[] = ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de', 'es'];

export function detectUserLanguage(): AppLanguage {
  // Locale routes render the correct copy on the first paint.
  const routeLocale = window.location.pathname.split('/')[1] as AppLanguage;
  if (SUPPORTED_APP_LANGUAGES.includes(routeLocale)) return routeLocale;

  // 1. Check LocalStorage if user previously chose a language
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null;
  if (saved && SUPPORTED_APP_LANGUAGES.includes(saved)) {
    return saved;
  }

  // 2. Check Browser Timezone (Geo-location estimation with 0ms network latency)
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timeZone.includes('Tokyo') || timeZone.includes('Japan')) return 'ja';
    if (timeZone.includes('Seoul') || timeZone.includes('Korea')) return 'ko';
    if (timeZone.includes('Shanghai') || timeZone.includes('Chongqing') || timeZone.includes('Beijing') || timeZone.includes('Hong_Kong') || timeZone.includes('Taipei')) return 'zh';
    if (timeZone.includes('Paris')) return 'fr';
    if (timeZone.includes('Berlin')) return 'de';
    if (timeZone.includes('Madrid')) return 'es';
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
    for (const code of SUPPORTED_APP_LANGUAGES) {
      if (lower.startsWith(code)) return code;
    }
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
