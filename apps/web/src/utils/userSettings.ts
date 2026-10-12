import type { SupportedLanguage } from '../types/meeting';

export type SubtitleDisplayMode = 'bilingual' | 'translation_only' | 'original_only';
export type SubtitleFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type SubtitleBgOpacity = 'light' | 'medium' | 'heavy';
export type VadSensitivity = 'low' | 'medium' | 'high';
export type GlossaryDomain = 'general' | 'it' | 'business';
export type ByokProvider = 'openai' | 'deepl' | 'gemini' | 'groq' | 'deepseek' | 'qwen' | 'anthropic';
export type TranslationTier = 'standard' | 'pro';
export type ActionSyncPlatform = 'slack' | 'trello' | 'jira' | 'custom';
export type AudioBoothVoiceGender = 'auto' | 'male' | 'female';
export type VirtualBackgroundMode = 'none' | 'blur_light' | 'blur_deep';
export type AudioTrackMode = 'original' | 'translated_only' | 'dual_ducking';

export interface UserMeetingSettings {
  nativeLanguage?: SupportedLanguage;
  subtitleDisplayMode: SubtitleDisplayMode;
  subtitleFontSize: SubtitleFontSize;
  subtitleBgOpacity: SubtitleBgOpacity;
  liveTranslationEnabled: boolean;
  translationTier: TranslationTier;
  glossaryDomain: GlossaryDomain;
  customGlossary: Record<string, string>;
  vadSensitivity: VadSensitivity;
  audioDuckingEnabled: boolean;
  audioBoothVoiceGender: AudioBoothVoiceGender;
  audioBoothSpeedRate: number;
  audioTrackMode: AudioTrackMode;
  dubbingTargetLanguage?: SupportedLanguage;
  dubbingVolume: number;
  duckedVolume: number;
  byokEnabled: boolean;
  byokProvider: ByokProvider;
  byokApiKey: string;
  providerKeys?: Partial<Record<ByokProvider, string>>;
  audioChunkMs?: number;
  unlimitedFreeMeeting?: boolean;
  autoAiMinutesExport?: boolean;
  actionSyncPlatform: ActionSyncPlatform;
  actionSyncWebhookUrl: string;
  showInterimSubtitles: boolean;
  virtualBackground: VirtualBackgroundMode;
  aiNoiseSuppression: boolean;
}

export const DEFAULT_USER_SETTINGS: UserMeetingSettings = {
  nativeLanguage: 'en',
  subtitleDisplayMode: 'bilingual',
  subtitleFontSize: 'md',
  subtitleBgOpacity: 'medium',
  liveTranslationEnabled: true,
  translationTier: 'standard',
  glossaryDomain: 'general',
  customGlossary: {},
  vadSensitivity: 'low',
  audioDuckingEnabled: true,
  audioBoothVoiceGender: 'auto',
  audioBoothSpeedRate: 1.0,
  audioTrackMode: 'dual_ducking',
  dubbingTargetLanguage: undefined,
  dubbingVolume: 1.0,
  duckedVolume: 0.18,
  byokEnabled: false,
  byokProvider: 'openai',
  byokApiKey: '',
  providerKeys: {},
  audioChunkMs: 350,
  unlimitedFreeMeeting: true,
  autoAiMinutesExport: false,
  actionSyncPlatform: 'slack',
  actionSyncWebhookUrl: '',
  showInterimSubtitles: true,
  virtualBackground: 'none',
  aiNoiseSuppression: true,
};

const STORAGE_KEY = 'layameet_user_settings';
const EVENT_NAME = 'layameet_settings_changed';

export function getUserSettings(): UserMeetingSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserMeetingSettings>;
    const customGlossary = parsed.customGlossary && typeof parsed.customGlossary === 'object'
      ? Object.fromEntries(
          Object.entries(parsed.customGlossary).filter(
            ([term, translation]) => term.trim() && typeof translation === 'string' && translation.trim(),
          ),
        )
      : {};
    const providerKeys = { ...(parsed.providerKeys || {}) };
    if (parsed.byokProvider && parsed.byokApiKey && !providerKeys[parsed.byokProvider]) {
      providerKeys[parsed.byokProvider] = parsed.byokApiKey;
    }
    const savedNative = (localStorage.getItem('layameet:native-language') as SupportedLanguage | null) || undefined;
    const rawMode = parsed.audioTrackMode;
    const audioTrackMode: AudioTrackMode = (rawMode === 'original' || rawMode === 'translated_only' || rawMode === 'dual_ducking')
      ? rawMode
      : DEFAULT_USER_SETTINGS.audioTrackMode;
    const dubbingVolume = typeof parsed.dubbingVolume === 'number' && parsed.dubbingVolume >= 0 && parsed.dubbingVolume <= 1
      ? parsed.dubbingVolume
      : DEFAULT_USER_SETTINGS.dubbingVolume;
    const duckedVolume = typeof parsed.duckedVolume === 'number' && parsed.duckedVolume >= 0.05 && parsed.duckedVolume <= 0.5
      ? parsed.duckedVolume
      : DEFAULT_USER_SETTINGS.duckedVolume;

    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
      nativeLanguage: parsed.nativeLanguage || savedNative || DEFAULT_USER_SETTINGS.nativeLanguage,
      customGlossary,
      providerKeys,
      audioBoothVoiceGender: parsed.audioBoothVoiceGender || DEFAULT_USER_SETTINGS.audioBoothVoiceGender,
      audioBoothSpeedRate: typeof parsed.audioBoothSpeedRate === 'number' ? parsed.audioBoothSpeedRate : DEFAULT_USER_SETTINGS.audioBoothSpeedRate,
      audioTrackMode,
      dubbingTargetLanguage: parsed.dubbingTargetLanguage || DEFAULT_USER_SETTINGS.dubbingTargetLanguage,
      dubbingVolume,
      duckedVolume,
      audioChunkMs: parsed.audioChunkMs ?? DEFAULT_USER_SETTINGS.audioChunkMs,
      unlimitedFreeMeeting: parsed.unlimitedFreeMeeting ?? DEFAULT_USER_SETTINGS.unlimitedFreeMeeting,
      virtualBackground: parsed.virtualBackground || DEFAULT_USER_SETTINGS.virtualBackground,
      aiNoiseSuppression: parsed.aiNoiseSuppression ?? DEFAULT_USER_SETTINGS.aiNoiseSuppression,
    };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserMeetingSettings>): UserMeetingSettings {
  if (typeof window === 'undefined') return DEFAULT_USER_SETTINGS;
  try {
    const current = getUserSettings();
    if (settings.nativeLanguage) {
      try {
        localStorage.setItem('layameet:native-language', settings.nativeLanguage);
      } catch {
        // Ignore
      }
    }
    const updatedKeys = {
      ...(current.providerKeys || {}),
      ...(settings.providerKeys || {}),
    };
    if (settings.byokProvider && typeof settings.byokApiKey === 'string') {
      updatedKeys[settings.byokProvider] = settings.byokApiKey;
    } else if (settings.byokProvider && updatedKeys[settings.byokProvider] && !settings.byokApiKey) {
      settings.byokApiKey = updatedKeys[settings.byokProvider];
    }
    const updated: UserMeetingSettings = {
      ...current,
      ...settings,
      providerKeys: updatedKeys,
    };
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
