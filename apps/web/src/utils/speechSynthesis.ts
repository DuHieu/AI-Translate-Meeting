export interface TTSOptions {
  enabled: boolean;
  volume: number;
  rate: number;
  pitch: number;
  voiceURI?: string;
}

export type TTSListener = (options: TTSOptions, isPlaying: boolean) => void;

class TTSEngine {
  private queue: string[] = [];
  public isPlaying = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private listeners: Set<TTSListener> = new Set();
  public options: TTSOptions = {
    enabled: false,
    volume: 1,
    rate: 1.05,
    pitch: 1,
  };
  private targetLanguage = 'vi';

  constructor() {
    this.loadSettings();
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
      this.notify();
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public subscribe(listener: TTSListener): () => void {
    this.listeners.add(listener);
    listener(this.options, this.isPlaying);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.options, this.isPlaying);
    }
  }

  public setLanguage(lang: string) {
    this.targetLanguage = lang;
  }

  public speak(text: string) {
    if (!this.options.enabled || !('speechSynthesis' in window)) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    // Prune stale queue items in real-time meetings so speech never lags behind
    if (this.queue.length >= 2) {
      this.queue = this.queue.slice(-1);
    }
    this.queue.push(cleanText);
    this.processQueue();
  }

  public speakPreview(sampleText?: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.stop();
    const text = sampleText || (
      this.targetLanguage.startsWith('en')
        ? 'Welcome to LayaMeet AI. Real-time translation is active.'
        : this.targetLanguage.startsWith('ja')
        ? 'LayaMeetへようこそ。リアルタイム翻訳が有効です。'
        : this.targetLanguage.startsWith('zh')
        ? '欢迎使用 LayaMeet，实时翻译已启用。'
        : this.targetLanguage.startsWith('ko')
        ? 'LayaMeet에 오신 것을 환영합니다. 실시간 번역이 활성화되었습니다.'
        : 'Chào mừng bạn đến với LayaMeet AI. Bản dịch thời gian thực đang phát.'
    );
    this.queue.push(text);
    this.processQueue(true);
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.queue = [];
    this.isPlaying = false;
    this.currentUtterance = null;
    this.notify();
  }

  private getBestVoiceForLang(langCode: string): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    if (voices.length === 0) return null;

    // 1. If user explicitly chose a voiceURI, prioritize it
    if (this.options.voiceURI) {
      const explicit = voices.find((v) => v.voiceURI === this.options.voiceURI);
      if (explicit) return explicit;
    }

    // 2. Look for natural/neural voices matching language
    const langPrefix = langCode.slice(0, 2).toLowerCase();
    const matchingVoices = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix));

    if (matchingVoices.length === 0) return null;

    // Prefer online/natural/neural voices in Windows WebView2 & Edge
    const preferred = matchingVoices.find((v) =>
      /natural|neural|online|premium/i.test(v.name)
    );
    return preferred || matchingVoices[0];
  }

  private processQueue(force = false) {
    if ((this.isPlaying && !force) || this.queue.length === 0 || !('speechSynthesis' in window)) return;

    const text = this.queue.shift();
    if (!text) return;

    this.isPlaying = true;
    this.notify();

    const utterance = new SpeechSynthesisUtterance(text);

    let langCode = 'vi-VN';
    if (this.targetLanguage.startsWith('en')) langCode = 'en-US';
    else if (this.targetLanguage.startsWith('ja')) langCode = 'ja-JP';
    else if (this.targetLanguage.startsWith('zh')) langCode = 'zh-CN';
    else if (this.targetLanguage.startsWith('ko')) langCode = 'ko-KR';
    else if (this.targetLanguage.startsWith('fr')) langCode = 'fr-FR';
    else if (this.targetLanguage.startsWith('de')) langCode = 'de-DE';
    else if (this.targetLanguage.startsWith('es')) langCode = 'es-ES';

    utterance.lang = langCode;
    utterance.volume = this.options.volume;
    utterance.rate = this.options.rate;
    utterance.pitch = this.options.pitch;

    const bestVoice = this.getBestVoiceForLang(langCode);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      this.notify();
      this.processQueue();
    };

    utterance.onerror = (e) => {
      // Ignore user-induced cancel errors
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('[TTSEngine] Utterance error:', e.error);
      }
      this.isPlaying = false;
      this.currentUtterance = null;
      this.notify();
      this.processQueue();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public updateSettings(newSettings: Partial<TTSOptions>) {
    this.options = { ...this.options, ...newSettings };
    try {
      localStorage.setItem('layameet-tts-settings', JSON.stringify(this.options));
    } catch {
      // ignore localStorage quota
    }
    if (!this.options.enabled) {
      this.stop();
    } else {
      this.notify();
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('layameet-tts-settings');
      if (saved) {
        this.options = { ...this.options, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }
}

export const ttsEngine = new TTSEngine();
