import { AppLanguage, TranslationDictionary } from './types';
import { vi } from './locales/vi';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { zh } from './locales/zh';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { es } from './locales/es';

export const translations: Record<AppLanguage, TranslationDictionary> = {
  vi,
  en,
  ja,
  ko,
  zh,
  fr,
  de,
  es,
};

export * from './types';
