export interface TTSOptions {
  enabled: boolean;
  volume: number;
  rate: number;
}

class TTSEngine {
  private queue: string[] = [];
  private isPlaying = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  public options: TTSOptions = {
    enabled: false,
    volume: 1,
    rate: 1,
  };
  private targetLanguage = 'vi';

  constructor() {
    this.loadSettings();
  }

  public setLanguage(lang: string) {
    this.targetLanguage = lang;
  }

  public speak(text: string) {
    if (!this.options.enabled || !('speechSynthesis' in window)) return;
    this.queue.push(text);
    this.processQueue();
  }

  public stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.queue = [];
    this.isPlaying = false;
    this.currentUtterance = null;
  }

  private processQueue() {
    if (this.isPlaying || this.queue.length === 0 || !('speechSynthesis' in window)) return;
    
    const text = this.queue.shift();
    if (!text) return;

    this.isPlaying = true;
    const utterance = new SpeechSynthesisUtterance(text);
    
    let langCode = 'vi-VN';
    if (this.targetLanguage.startsWith('en')) langCode = 'en-US';
    else if (this.targetLanguage.startsWith('ja')) langCode = 'ja-JP';
    else if (this.targetLanguage.startsWith('zh')) langCode = 'zh-CN';
    else if (this.targetLanguage.startsWith('ko')) langCode = 'ko-KR';

    utterance.lang = langCode;
    utterance.volume = this.options.volume;
    utterance.rate = this.options.rate;

    utterance.onend = () => {
      this.isPlaying = false;
      this.processQueue();
    };
    utterance.onerror = () => {
      this.isPlaying = false;
      this.processQueue();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public updateSettings(newSettings: Partial<TTSOptions>) {
    this.options = { ...this.options, ...newSettings };
    localStorage.setItem('layameet-tts-settings', JSON.stringify(this.options));
    if (!this.options.enabled) {
      this.stop();
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
