import { SupportedLanguage } from '../types/meeting';
import { LayaMetadata } from '../types/subtitle';
import { getUserSettings } from '../utils/userSettings';
import {
  isDesktopApp,
  prepareLocalStt,
  startLocalStt,
  stopLocalStt,
  onLocalTranscript,
} from '../utils/desktopBridge';
import { desktopModuleManager } from './desktopModuleManager';

export type P2PTranslationEngineName =
  | 'chrome-ai'
  | 'byok-llm'
  | 'neural-edge'
  | 'local-fallback';

export type P2PSttEngineName =
  | 'sherpa-native'
  | 'browser-speech'
  | 'byok-whisper'
  | 'manual-caption';

export interface P2PTranslationResult {
  translatedText: string;
  engine: P2PTranslationEngineName;
  latencyMs: number;
}

export interface P2PLayaClassification {
  tags: string[];
  layaMetadata: LayaMetadata;
}

const SPEECH_BCP47_MAP: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  th: 'th-TH',
  id: 'id-ID',
  tl: 'fil-PH',
  ar: 'ar-SA',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
};

const LANGUAGE_NAMES: Record<string, string> = {
  vi: 'Vietnamese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese (Simplified)',
  th: 'Thai',
  id: 'Indonesian',
  tl: 'Tagalog',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
};

const translationCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 500;

function setCachedTranslation(key: string, value: string): void {
  if (translationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, value);
}

/**
 * Built-in offline phrasebook for common IT & Enterprise meeting expressions when completely offline.
 */
const OFFLINE_MEETING_PHRASES: Record<string, Record<string, string>> = {
  'xin chào mọi người': {
    en: 'Hello everyone',
    ja: '皆さん、こんにちは',
  },
  'chào buổi sáng': {
    en: 'Good morning',
    ja: 'おはようございます',
  },
  'cảm ơn mọi người': {
    en: 'Thank you everyone',
    ja: '皆さん、ありがとうございます',
  },
  'chúng ta bắt đầu cuộc họp nhé': {
    en: "Let's start the meeting",
    ja: '会議を始めましょう',
  },
  'tôi đồng ý với phương án này': {
    en: 'I agree with this plan',
    ja: 'この案に賛成です',
  },
  'cần kiểm tra lại pull request trước khi deploy lên production': {
    en: 'We need to review the Pull Request before deploying to Production',
    ja: '本番環境へデプロイする前にプルリクエストをレビューする必要があります',
  },
  'hệ thống staging đã sẵn sàng để kiểm thử': {
    en: 'The Staging environment is ready for QA testing',
    ja: 'ステージング環境でのテスト準備が完了しました',
  },
  'hello everyone': {
    vi: 'Xin chào mọi người',
    ja: '皆さん、こんにちは',
  },
  'let us start the meeting': {
    vi: 'Chúng ta hãy bắt đầu cuộc họp',
    ja: '会議を始めましょう',
  },
  'みなさんこんにちは': {
    vi: 'Xin chào mọi người',
    en: 'Hello everyone',
  },
  'よろしくお願いします': {
    vi: 'Rất mong nhận được sự hợp tác của mọi người',
    en: 'Thank you in advance for your cooperation',
  },
};

interface ChromeTranslatorInstance {
  translate: (text: string) => Promise<string>;
}

interface ChromeTranslatorFactory {
  canTranslate?: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  createTranslator?: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<ChromeTranslatorInstance>;
  create?: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<ChromeTranslatorInstance>;
}

/**
 * Tier 1: Chrome Built-in On-Device AI Translator API (window.ai.translator / window.Translator)
 */
async function tryChromeBuiltInTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const win = window as unknown as {
      ai?: { translator?: ChromeTranslatorFactory };
      translation?: ChromeTranslatorFactory;
      Translator?: ChromeTranslatorFactory;
    };

    const factory = win.Translator || win.ai?.translator || win.translation;
    if (!factory) return null;

    const createFn = factory.create || factory.createTranslator;
    if (!createFn) return null;

    if (factory.canTranslate) {
      const capability = await factory.canTranslate({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });
      if (capability === 'no') return null;
    }

    const translator = await createFn({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    });
    const result = await translator.translate(text);
    return result?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Tier 2: Direct Client-Side BYOK LLM Translation (OpenAI / Gemini / Groq) with IT Glossary Context
 */
async function tryByokClientTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string | null> {
  const settings = getUserSettings();
  if (!settings.byokEnabled || !settings.byokApiKey?.trim()) {
    return null;
  }

  const apiKey = settings.byokApiKey.trim();
  const provider = settings.byokProvider || 'openai';
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;
  const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const glossary = desktopModuleManager
    .getItGlossary()
    .slice(0, 12)
    .map((g) => `${g.vi} = ${g.en} = ${g.ja}`)
    .join('; ');

  const systemPrompt = `You are a real-time IT & Software Engineering meeting interpreter. Translate the user's speech from ${sourceName} to ${targetName}. Respect IT terminology (${glossary}). Output ONLY the translated text without quotes or explanations.`;

  try {
    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nSpeech: ${text}` }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
          }),
        },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    }

    const isGroq = apiKey.startsWith('gsk_');
    const endpoint = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Tier 3: Zero-Config Free Client-Side Neural Translation (Google GTX Edge + MyMemory Fallback)
 */
async function tryNeuralEdgeTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string | null> {
  const sl = sourceLang === 'zh' ? 'zh-CN' : sourceLang || 'auto';
  const tl = targetLang === 'zh' ? 'zh-CN' : targetLang;

  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(gtxUrl, { method: 'GET' });
    if (res.ok) {
      const data = (await res.json()) as unknown;
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const segments = (data[0] as unknown[])
          .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
          .join('')
          .trim();
        if (segments) return segments;
      }
    }
  } catch {
    // Fallback to MyMemory below
  }

  try {
    const pair = `${sl === 'auto' ? 'en' : sl}|${tl}`;
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
    const res = await fetch(mmUrl, { method: 'GET' });
    if (res.ok) {
      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      const translated = data.responseData?.translatedText?.trim();
      if (translated && !translated.includes('MYMEMORY WARNING')) {
        return translated;
      }
    }
  } catch {
    // Ignore network error
  }

  return null;
}

/**
 * Translates text directly on the client device without requiring the Python AI Server.
 */
export async function translateTextP2P(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<P2PTranslationResult> {
  const startedAt = performance.now();
  const cleanText = text.trim();
  const normSource = (sourceLanguage || 'vi').toLowerCase().split('-')[0];
  const normTarget = (targetLanguage || 'en').toLowerCase().split('-')[0];

  if (!cleanText || normSource === normTarget) {
    return {
      translatedText: cleanText,
      engine: 'local-fallback',
      latencyMs: 0,
    };
  }

  const cacheKey = `${normSource}:${normTarget}:${cleanText.toLowerCase()}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return {
      translatedText: cached,
      engine: 'neural-edge',
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  }

  const chromeTranslation = await tryChromeBuiltInTranslate(cleanText, normSource, normTarget);
  if (chromeTranslation) {
    setCachedTranslation(cacheKey, chromeTranslation);
    return {
      translatedText: chromeTranslation,
      engine: 'chrome-ai',
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  }

  const byokTranslation = await tryByokClientTranslate(cleanText, normSource, normTarget);
  if (byokTranslation) {
    setCachedTranslation(cacheKey, byokTranslation);
    return {
      translatedText: byokTranslation,
      engine: 'byok-llm',
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  }

  const edgeTranslation = await tryNeuralEdgeTranslate(cleanText, normSource, normTarget);
  if (edgeTranslation) {
    setCachedTranslation(cacheKey, edgeTranslation);
    return {
      translatedText: edgeTranslation,
      engine: 'neural-edge',
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  }

  const normalizedKey = cleanText.toLowerCase().replace(/[.!?。！？]+$/g, '').trim();
  const offlineMatch = OFFLINE_MEETING_PHRASES[normalizedKey]?.[normTarget];
  if (offlineMatch) {
    return {
      translatedText: offlineMatch,
      engine: 'local-fallback',
      latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  }

  return {
    translatedText: cleanText,
    engine: 'local-fallback',
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
}

/**
 * On-Device Laya Intelligence Classifier (Action Items, ADR Decisions, Critical Risks, Questions)
 */
export function classifySubtitleLayaTags(text: string): P2PLayaClassification {
  const normalized = text.toLowerCase();
  const tags: string[] = [];

  const isDecision =
    /\b(quyết định|chốt phương án|thống nhất là|đồng ý duyệt|phê duyệt|merge pr|chốt kiến trúc|we decided|agreed to|approved|final decision|決定しました|合意しました|承認します)\b/i.test(
      normalized,
    );
  const isActionItem =
    /\b(sẽ phụ trách|nhờ bạn|hoàn thành trước|hạn chót|deadline|action item|giao cho|tạo ticket|fix bug|i will handle|please complete|by tomorrow|by friday|担当します|期限まで|対応をお願いします)\b/i.test(
      normalized,
    );
  const isRisk =
    /\b(rủi ro|chậm tiến độ|nguy cơ|lỗi nghiêm trọng|khẩn cấp|sập server|rollback|incident|blocker|critical risk|delayed|bottleneck|リスク|遅延|緊急課題|本番障害)\b/i.test(
      normalized,
    );
  const isQuestion = /[?？]$|\b(làm thế nào|khi nào xong|có đồng ý không|what do you think|how should we)\b/i.test(
    normalized,
  );

  if (isDecision) tags.push('decision');
  if (isActionItem) tags.push('action_item');
  if (isRisk) tags.push('critical_risk');
  if (isQuestion) tags.push('question');

  return {
    tags,
    layaMetadata: {
      isDecision,
      isActionItem,
      topic: isDecision ? 'ADR / Decision' : isActionItem ? 'Sprint Action Item' : null,
    },
  };
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventPayload extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventPayload) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface P2PTranscriberCallbacks {
  onTranscript: (text: string, isFinal: boolean, confidence: number) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onEngineChange?: (engine: P2PSttEngineName) => void;
}

/**
 * Multi-tier On-Device Speech Transcriber for Serverless P2P Rooms:
 * 1. Tauri Native Rust `sherpa-onnx` Zipformer when running on Desktop App (`sherpa-native`)
 * 2. Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) for instant 0MB streaming STT
 * 3. BYOK Whisper API / Manual Caption fallback
 */
export class P2PSpeechTranscriber {
  private recognition: SpeechRecognitionInstance | null = null;
  private unlistenNativeStt: (() => void) | null = null;
  private isRunning = false;
  private isMuted = false;
  private spokenLanguage: SupportedLanguage = 'vi';
  private restartTimer: number | null = null;
  private speakingResetTimer: number | null = null;
  private audioCtx: AudioContext | null = null;
  private analyserFrame: number | null = null;
  private callbacks: P2PTranscriberCallbacks;

  constructor(callbacks: P2PTranscriberCallbacks) {
    this.callbacks = callbacks;
  }

  start(spokenLanguage: SupportedLanguage, audioStream?: MediaStream | null): P2PSttEngineName {
    this.stop();
    this.isRunning = true;
    this.spokenLanguage = spokenLanguage;

    if (audioStream) {
      this.startAudioLevelMonitor(audioStream);
    }

    // If running inside Tauri Desktop App, also try connecting to native Rust sherpa-onnx
    if (isDesktopApp()) {
      void this.tryStartNativeDesktopStt();
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechConstructor) {
      this.initBrowserSpeechRecognition(SpeechConstructor);
      this.callbacks.onEngineChange?.('browser-speech');
      return 'browser-speech';
    }

    const settings = getUserSettings();
    if (settings.byokEnabled && settings.byokApiKey?.trim()) {
      this.callbacks.onEngineChange?.('byok-whisper');
      return 'byok-whisper';
    }

    this.callbacks.onEngineChange?.('manual-caption');
    return 'manual-caption';
  }

  private async tryStartNativeDesktopStt(): Promise<void> {
    try {
      const prepared = await prepareLocalStt();
      if (!prepared || !this.isRunning) return;
      const started = await startLocalStt();
      if (!started || !this.isRunning) return;

      this.unlistenNativeStt = await onLocalTranscript((t) => {
        if (!this.isRunning || this.isMuted || !t.text?.trim()) return;
        this.triggerSpeakingPulse();
        this.callbacks.onTranscript(t.text.trim(), Boolean(t.isFinal), t.confidence || 0.9);
      });
      this.callbacks.onEngineChange?.('sherpa-native');
    } catch {
      // Fallback to browser speech recognition
    }
  }

  private initBrowserSpeechRecognition(SpeechConstructor: new () => SpeechRecognitionInstance) {
    try {
      const rec = new SpeechConstructor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = SPEECH_BCP47_MAP[this.spokenLanguage] || 'vi-VN';

      rec.onresult = (event: SpeechRecognitionEventPayload) => {
        if (!this.isRunning || this.isMuted) return;

        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const alt = result?.[0];
          const text = alt?.transcript?.trim();
          if (!text) continue;

          this.triggerSpeakingPulse();

          if (result.isFinal) {
            this.callbacks.onTranscript(text, true, alt.confidence || 0.92);
          } else {
            interimText += (interimText ? ' ' : '') + text;
          }
        }

        if (interimText) {
          this.callbacks.onTranscript(interimText, false, 0.8);
        }
      };

      rec.onerror = (event) => {
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
          this.isRunning = false;
        }
      };

      rec.onend = () => {
        if (this.isRunning && !this.isMuted) {
          this.restartTimer = window.setTimeout(() => {
            if (!this.isRunning || this.isMuted) return;
            try {
              rec.lang = SPEECH_BCP47_MAP[this.spokenLanguage] || 'vi-VN';
              rec.start();
            } catch {
              // Ignore overlapping start
            }
          }, 250);
        }
      };

      this.recognition = rec;
      if (!this.isMuted) {
        rec.start();
      }
    } catch {
      // Browser may block until user gesture
    }
  }

  private triggerSpeakingPulse() {
    this.callbacks.onSpeakingChange?.(true);
    if (this.speakingResetTimer !== null) {
      window.clearTimeout(this.speakingResetTimer);
    }
    this.speakingResetTimer = window.setTimeout(() => {
      this.callbacks.onSpeakingChange?.(false);
    }, 1200);
  }

  private startAudioLevelMonitor(stream: MediaStream) {
    if (stream.getAudioTracks().length === 0) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.audioCtx = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let wasSpeaking = false;

      const checkVolume = () => {
        if (!this.isRunning) return;
        if (!this.isMuted) {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const nowSpeaking = avg > 18;
          if (nowSpeaking !== wasSpeaking) {
            wasSpeaking = nowSpeaking;
            this.callbacks.onSpeakingChange?.(nowSpeaking);
          }
        }
        this.analyserFrame = requestAnimationFrame(checkVolume);
      };

      this.analyserFrame = requestAnimationFrame(checkVolume);
    } catch {
      // Ignore AudioContext errors
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.callbacks.onSpeakingChange?.(false);
      try {
        this.recognition?.stop();
      } catch {
        // Ignore
      }
    } else if (this.isRunning && this.recognition) {
      try {
        this.recognition.lang = SPEECH_BCP47_MAP[this.spokenLanguage] || 'vi-VN';
        this.recognition.start();
      } catch {
        // Ignore if already started
      }
    }
  }

  setSpokenLanguage(lang: SupportedLanguage) {
    if (this.spokenLanguage === lang) return;
    this.spokenLanguage = lang;
    if (this.recognition && this.isRunning && !this.isMuted) {
      try {
        this.recognition.lang = SPEECH_BCP47_MAP[lang] || 'vi-VN';
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.unlistenNativeStt) {
      this.unlistenNativeStt();
      this.unlistenNativeStt = null;
    }
    if (isDesktopApp()) {
      void stopLocalStt();
    }
    if (this.restartTimer !== null) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.speakingResetTimer !== null) {
      window.clearTimeout(this.speakingResetTimer);
      this.speakingResetTimer = null;
    }
    if (this.analyserFrame !== null) {
      cancelAnimationFrame(this.analyserFrame);
      this.analyserFrame = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
    }
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
  }
}
