export type SubtitleDisplayMode = 'bilingual' | 'translation_only' | 'original_only';
export type SubtitleFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type SubtitleBgOpacity = 'light' | 'medium' | 'heavy';
export type VadSensitivity = 'low' | 'medium' | 'high';
export type GlossaryDomain = 'general' | 'it' | 'business';
export type ByokProvider = 'openai' | 'deepl' | 'gemini';

export interface UserMeetingSettings {
  subtitleDisplayMode: SubtitleDisplayMode;
  subtitleFontSize: SubtitleFontSize;
  subtitleBgOpacity: SubtitleBgOpacity;
  liveTranslationEnabled: boolean;
  glossaryDomain: GlossaryDomain;
  vadSensitivity: VadSensitivity;
  audioDuckingEnabled: boolean;
  byokEnabled: boolean;
  byokProvider: ByokProvider;
  byokApiKey: string;
}

export const DEFAULT_USER_SETTINGS: UserMeetingSettings = {
  subtitleDisplayMode: 'bilingual',
  subtitleFontSize: 'md',
  subtitleBgOpacity: 'medium',
  liveTranslationEnabled: true,
  glossaryDomain: 'general',
  vadSensitivity: 'medium',
  audioDuckingEnabled: true,
  byokEnabled: false,
  byokProvider: 'openai',
  byokApiKey: '',
};

const STORAGE_KEY = 'layameet_user_settings';
const EVENT_NAME = 'layameet_settings_changed';

export function getUserSettings(): UserMeetingSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserMeetingSettings>): UserMeetingSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const current = getUserSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    return updated;
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function subscribeUserSettings(callback: (settings: UserMeetingSettings) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<UserMeetingSettings>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
