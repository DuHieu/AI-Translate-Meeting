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

export function speakText(
  text: string,
  preferredLang?: string,
  onStart?: () => void,
  onEnd?: () => void,
  speechRate = 0.95,
  volume = 1.0
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    if (!text.trim()) return false;

    const utterance = new SpeechSynthesisUtterance(text.trim());
    const resolvedLang = preferredLang
      ? (BCP47_MAP[preferredLang.toLowerCase()] || preferredLang)
      : detectSpokenLanguage(text);
    utterance.lang = resolvedLang;
    utterance.rate = Math.max(0.75, Math.min(1.4, speechRate));
    utterance.pitch = 1.0;
    utterance.volume = Math.max(0, Math.min(1.0, volume));

    if (onStart) utterance.onstart = onStart;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    if (onEnd) onEnd();
    return false;
  }
}

export function stopSpeech(): void {
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
