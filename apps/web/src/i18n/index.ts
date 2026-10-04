import { AppLanguage, TranslationDictionary } from './types';
import { vi } from './locales/vi';
import { en } from './locales/en';
import { ja } from './locales/ja';

export const translations: Record<AppLanguage, TranslationDictionary> = {
  vi,
  en,
  ja,
};

export * from './types';
