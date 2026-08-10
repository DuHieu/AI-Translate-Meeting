import { SubtitleMessage } from '../types/subtitle';

type SubtitleCallback = (msg: SubtitleMessage) => void;

interface SubtitleConnectOptions {
  meetingId: string;
  participantId: string;
  participantName: string;
  sourceLanguage: string;
  targetLanguage: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function createClientSubtitleId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `subtitle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeSubtitleMessage(raw: unknown, preferredTargetLanguage: string): SubtitleMessage | null {
  if (!isRecord(raw)) return null;

  const payload = raw.type === 'subtitle' && isRecord(raw.data) ? raw.data : raw;

  if (!isRecord(payload)) return null;

  const translations = isRecord(payload.translations) ? payload.translations : null;
  const targetLanguage = readString(payload.targetLanguage, preferredTargetLanguage);
  const translatedText = readString(
    payload.translatedText,
    translations ? readString(translations[targetLanguage], '') : '',
  );
  const originalText = readString(payload.originalText);

  if (!originalText && !translatedText) return null;

  return {
    id: readString(payload.id, createClientSubtitleId()),
    meetingId: readString(payload.meetingId),
    participantId: readString(payload.participantId),
    participantName: readString(payload.participantName, 'Participant'),
    sourceLanguage: readString(payload.sourceLanguage, 'unknown'),
    targetLanguage,
    originalText,
    translatedText: translatedText || originalText,
    isFinal: typeof payload.isFinal === 'boolean' ? payload.isFinal : true,
    timestamp: readString(payload.timestamp, new Date().toISOString()),
  };
}

export class SubtitleWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<SubtitleCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private isIntentionalClose = false;
  private currentOptions: SubtitleConnectOptions | null = null;
  private suppressNextCloseReconnect = false;

  connect(options: SubtitleConnectOptions) {
    this.isIntentionalClose = false;
    this.currentOptions = options;
    const wsUrl = this.buildUrl(options);

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) &&
      this.ws.url === wsUrl
    ) {
      return;
    }

    try {
      if (this.ws) {
        this.suppressNextCloseReconnect = true;
        this.ws.close();
      }
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[SubtitleWS] Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const subtitle = normalizeSubtitleMessage(data, options.targetLanguage);
          if (subtitle) {
            this.listeners.forEach((cb) => cb(subtitle));
          }
        } catch (err) {
          console.error('[SubtitleWS] Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        if (this.suppressNextCloseReconnect) {
          this.suppressNextCloseReconnect = false;
          return;
        }

        if (!this.isIntentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('[SubtitleWS] Error:', err);
      };
    } catch (err) {
      console.error('[SubtitleWS] Connection exception:', err);
      this.scheduleReconnect();
    }
  }

  private buildUrl(options: SubtitleConnectOptions): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const endpoint = import.meta.env.VITE_SUBTITLE_WS_URL || `${protocol}//${window.location.host}/ws/transcribe`;
    const url = new URL(endpoint, `${protocol}//${window.location.host}`);

    url.searchParams.set('meetingId', options.meetingId);
    url.searchParams.set('participantId', options.participantId);
    url.searchParams.set('participantName', options.participantName);
    url.searchParams.set('sourceLanguage', options.sourceLanguage);
    url.searchParams.set('targetLanguage', options.targetLanguage);

    return url.toString();
  }

  private scheduleReconnect() {
    if (!this.currentOptions) return;

    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 5s, 10s, capped at 30s
    const delays = [1000, 2000, 5000, 10000];
    const delay = delays[this.reconnectAttempts - 1] || this.maxReconnectDelay;
    console.log(`[SubtitleWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => {
      if (!this.isIntentionalClose && this.currentOptions) {
        this.connect(this.currentOptions);
      }
    }, delay);
  }

  sendAudioChunk(chunk: ArrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk);
    }
  }

  subscribe(callback: SubtitleCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  disconnect() {
    this.isIntentionalClose = true;
    this.currentOptions = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const subtitleWsService = new SubtitleWebSocketService();
