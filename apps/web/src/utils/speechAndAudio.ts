/**
 * Helper utilities for browser Web Speech Synthesis (Replay Utterance)
 * and Web Audio API synthesized notification chimes.
 */

const BCP47_MAP: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
};

let cachedVoices: SpeechSynthesisVoice[] = [];
let voiceRefreshRegistered = false;

function loadSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];

  cachedVoices = window.speechSynthesis.getVoices();
  if (!voiceRefreshRegistered) {
    voiceRefreshRegistered = true;
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  }
  return cachedVoices;
}

const MALE_VOICE_REGEX = /\b(male|nam|man|david|mark|george|guy|ichiro|keita|paul|stefan)\b/i;
const FEMALE_VOICE_REGEX = /\b(female|nữ|nu|woman|zira|jenny|samantha|kyoko|ayumi|sara|victoria|anna|helena)\b/i;

function findBestVoice(resolvedLang: string, gender: 'auto' | 'male' | 'female' = 'auto'): SpeechSynthesisVoice | undefined {
  const voices = loadSpeechVoices();
  const normalizedLang = resolvedLang.toLowerCase();
  const baseLang = normalizedLang.split('-')[0];

  const matchingVoices = voices.filter((voice) => {
    const vLang = voice.lang.toLowerCase();
    return vLang === normalizedLang || vLang.startsWith(`${baseLang}-`);
  });

  if (matchingVoices.length === 0) {
    return voices.find((voice) => voice.default && voice.lang.toLowerCase().startsWith(baseLang));
  }

  if (gender === 'male') {
    const maleVoice = matchingVoices.find((v) => MALE_VOICE_REGEX.test(v.name));
    if (maleVoice) return maleVoice;
  } else if (gender === 'female') {
    const femaleVoice = matchingVoices.find((v) => FEMALE_VOICE_REGEX.test(v.name));
    if (femaleVoice) return femaleVoice;
  }

  // Fallback to exact language match or first available match
  return matchingVoices.find((voice) => voice.lang.toLowerCase() === normalizedLang)
    || matchingVoices[0];
}

export function detectSpokenLanguage(text: string): string {
  // Korean: Hangul syllables and jamo
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(text)) {
    return 'ko-KR';
  }
  // Japanese: Hiragana, Katakana
  if (/[\u3040-\u30ff]/.test(text)) {
    return 'ja-JP';
  }
  // Chinese: CJK Unified Ideographs
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh-CN';
  }
  // Vietnamese accented characters
  if (/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text)) {
    return 'vi-VN';
  }
  // German umlauts/eszett
  if (/[äöüß]/i.test(text)) {
    return 'de-DE';
  }
  // French accents
  if (/[éèêëàâùûçîïô]/i.test(text)) {
    return 'fr-FR';
  }
  // Spanish inverted punctuation / accents
  if (/[áéíóúñ¿¡]/i.test(text)) {
    return 'es-ES';
  }
  // Default to English
  return 'en-US';
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeCloudAudio: HTMLAudioElement | null = null;
let speechStartWatchdog: number | null = null;

function playCloudTtsFallback(
  text: string,
  resolvedLang: string,
  speechRate: number,
  volume: number,
  onStart?: () => void,
  onEnd?: () => void,
): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    if (onEnd) onEnd();
    return false;
  }

  try {
    if (activeCloudAudio) {
      activeCloudAudio.pause();
      activeCloudAudio.src = '';
      activeCloudAudio = null;
    }

    const baseLang = resolvedLang.toLowerCase().startsWith('zh')
      ? 'zh-CN'
      : resolvedLang.split('-')[0].toLowerCase() || 'vi';
    const ttsUrl = `/api/translation/tts?tl=${encodeURIComponent(baseLang)}&q=${encodeURIComponent(text.slice(0, 200))}`;
    const audio = new Audio(ttsUrl);
    audio.playbackRate = Math.max(0.75, Math.min(1.4, speechRate));
    audio.volume = Math.max(0, Math.min(1.0, volume));
    activeCloudAudio = audio;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (activeCloudAudio === audio) {
        activeCloudAudio = null;
      }
      if (onEnd) onEnd();
    };

    audio.onplaying = () => {
      if (onStart) onStart();
    };
    audio.onended = finish;
    audio.onerror = finish;

    void audio.play().catch(() => {
      finish();
    });
    return true;
  } catch {
    if (onEnd) onEnd();
    return false;
  }
}

export function speakText(
  text: string,
  preferredLang?: string,
  onStart?: () => void,
  onEnd?: () => void,
  speechRate = 0.95,
  volume = 1.0,
  gender: 'auto' | 'male' | 'female' = 'auto'
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const trimmed = text.trim();
  if (!trimmed) return false;

  const resolvedLang = preferredLang
    ? (BCP47_MAP[preferredLang.toLowerCase()] || preferredLang)
    : detectSpokenLanguage(trimmed);

  stopSpeech();

  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return playCloudTtsFallback(trimmed, resolvedLang, speechRate, volume, onStart, onEnd);
  }

  try {
    const matchingVoice = findBestVoice(resolvedLang, gender);
    if (!matchingVoice) {
      return playCloudTtsFallback(trimmed, resolvedLang, speechRate, volume, onStart, onEnd);
    }

    const utterance = new SpeechSynthesisUtterance(trimmed);
    activeUtterance = utterance;
    utterance.lang = resolvedLang;
    utterance.voice = matchingVoice;
    utterance.rate = Math.max(0.75, Math.min(1.4, speechRate));
    utterance.pitch = 1.0;
    utterance.volume = Math.max(0, Math.min(1.0, volume));

    let started = false;
    let completed = false;
    const clearWatchdog = () => {
      if (speechStartWatchdog !== null) {
        window.clearTimeout(speechStartWatchdog);
        speechStartWatchdog = null;
      }
    };

    utterance.onstart = () => {
      started = true;
      clearWatchdog();
      if (onStart) onStart();
    };
    utterance.onend = () => {
      if (completed) return;
      completed = true;
      clearWatchdog();
      if (activeUtterance === utterance) activeUtterance = null;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (completed) return;
      completed = true;
      clearWatchdog();
      if (activeUtterance === utterance) activeUtterance = null;
      playCloudTtsFallback(trimmed, resolvedLang, speechRate, volume, onStart, onEnd);
    };

    speechStartWatchdog = window.setTimeout(() => {
      if (!started && !completed) {
        completed = true;
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
        playCloudTtsFallback(trimmed, resolvedLang, speechRate, volume, onStart, onEnd);
      }
    }, 800);

    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    return playCloudTtsFallback(trimmed, resolvedLang, speechRate, volume, onStart, onEnd);
  }
}

export function stopSpeech(): void {
  if (speechStartWatchdog !== null && typeof window !== 'undefined') {
    window.clearTimeout(speechStartWatchdog);
    speechStartWatchdog = null;
  }
  activeUtterance = null;
  if (activeCloudAudio) {
    try {
      activeCloudAudio.pause();
      activeCloudAudio.src = '';
    } catch {
      // ignore
    }
    activeCloudAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function playActionNotificationChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Pleasant two-tone interval: D5 (587.33 Hz) ascending to A5 (880.00 Hz)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);

    // Clean up context after playing
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Browsers may block audio context before first user gesture; ignore safely
  }
}
