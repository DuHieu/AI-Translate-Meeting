import { PipelinePhase, PipelineStatusMessage, SubtitleMessage } from '../types/subtitle';
import type { ByokProvider } from '../utils/userSettings';

type SubtitleCallback = (msg: SubtitleMessage) => void;
type PipelineStatusCallback = (status: PipelineStatusMessage) => void;

const PIPELINE_PHASES: ReadonlySet<PipelinePhase> = new Set([
  'transcribing',
  'translating',
  'ready',
  'failed',
]);

interface SubtitleConnectOptions {
  meetingId: string;
  participantId: string;
  subtitleToken: string;
  participantName: string;
  sourceLanguage: string;
  targetLanguage: string;
  domain?: string;
  initialPrompt?: string;
}

export interface SubtitleConfigPayload {
  domain: string;
  initialPrompt?: string;
  translationTier?: 'standard' | 'pro';
  byokEnabled?: boolean;
  byokProvider?: ByokProvider;
  byokApiKey?: string;
}

type SubtitleConfigExtra = Omit<SubtitleConfigPayload, 'domain' | 'initialPrompt'>;

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

  const directionRaw = readString(payload.direction, '');
  const direction =
    directionRaw === 'rtl' || directionRaw === 'ltr'
      ? directionRaw
      : undefined;
  const layaRaw = isRecord(payload.layaMetadata) ? payload.layaMetadata : null;

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
    tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : [],
    confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
    speakerSequence: typeof payload.speakerSequence === 'number' ? payload.speakerSequence : undefined,
    direction,
    latencyMs: typeof payload.latencyMs === 'number' ? payload.latencyMs : null,
    layaMetadata: layaRaw
      ? {
          isActionItem: Boolean(layaRaw.isActionItem),
          isDecision: Boolean(layaRaw.isDecision),
          topic: typeof layaRaw.topic === 'string' ? layaRaw.topic : null,
        }
      : null,
  };
}

export function normalizePipelineStatusMessage(raw: unknown): PipelineStatusMessage | null {
  if (!isRecord(raw) || raw.type !== 'pipeline_status' || !isRecord(raw.data)) return null;

  const payload = raw.data;
  const phase = readString(payload.phase) as PipelinePhase;
  const sequence = payload.sequence;
  const meetingId = readString(payload.meetingId);
  const utteranceId = readString(payload.utteranceId);
  const participantId = readString(payload.participantId);
  const liveKitIdentity = readString(payload.liveKitIdentity);
  const timestamp = readString(payload.timestamp);
  const expiresAt = readString(payload.expiresAt);

  if (
    !PIPELINE_PHASES.has(phase) ||
    typeof sequence !== 'number' ||
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    !meetingId ||
    !utteranceId ||
    !participantId ||
    !liveKitIdentity ||
    !timestamp ||
    !expiresAt
  ) {
    return null;
  }

  return {
    meetingId,
    utteranceId,
    participantId,
    liveKitIdentity,
    phase,
    sequence,
    timestamp,
    expiresAt,
    reasonCode: typeof payload.reasonCode === 'string' ? payload.reasonCode : null,
  };
}

export class SubtitleWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<SubtitleCallback> = new Set();
  private pipelineStatusListeners: Set<PipelineStatusCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private isIntentionalClose = false;
  private currentOptions: SubtitleConnectOptions | null = null;
  private suppressNextCloseReconnect = false;
  private reconnectTimer: number | null = null;
  private isAuthenticated = false;
  private currentConfig: SubtitleConfigPayload | null = null;

  connect(options: SubtitleConnectOptions) {
    this.isIntentionalClose = false;
    this.currentOptions = options;
    this.clearReconnectTimer();
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
      this.isAuthenticated = false;

      this.ws.onopen = () => {
        console.log('[SubtitleWS] Connected');
        this.isAuthenticated = true;
        const normalizedParticipantName = (options.participantName || '').trim().slice(0, 100) || 'Participant';
        this.ws?.send(
          JSON.stringify({
            type: 'authenticate',
            token: options.subtitleToken,
            participantName: normalizedParticipantName,
            sourceLanguage: options.sourceLanguage,
            targetLanguage: options.targetLanguage,
            clientType: 'web',
            sttCapability: 'server',
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (isRecord(data) && data.type === 'authenticated') {
            this.isAuthenticated = true;
            this.reconnectAttempts = 0;
            const activeDomain = options.domain || localStorage.getItem('ai-meeting-domain') || 'general';
            const activeInitialPrompt = options.initialPrompt || localStorage.getItem('ai-meeting-initial-prompt') || '';
            this.sendConfig(this.currentConfig || {
              domain: activeDomain,
              initialPrompt: activeInitialPrompt,
            });
            return;
          }
          const pipelineStatus = normalizePipelineStatusMessage(data);
          if (pipelineStatus) {
            this.isAuthenticated = true;
            this.pipelineStatusListeners.forEach((cb) => cb(pipelineStatus));
            return;
          }
          const subtitle = normalizeSubtitleMessage(data, options.targetLanguage);
          if (subtitle) {
            this.isAuthenticated = true;
            this.listeners.forEach((cb) => cb(subtitle));
          }
        } catch (err) {
          console.error('[SubtitleWS] Message parse error:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.isAuthenticated = false;
        if (this.suppressNextCloseReconnect) {
          this.suppressNextCloseReconnect = false;
          return;
        }

        if (event.code === 4400 || event.code === 4401 || event.code === 4403) {
          console.error('[SubtitleWS] Session authentication rejected');
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

    return url.toString();
  }

  private scheduleReconnect() {
    if (!this.currentOptions) return;

    this.clearReconnectTimer();
    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 5s, 10s, capped at 30s
    const delays = [1000, 2000, 5000, 10000];
    const delay = delays[this.reconnectAttempts - 1] || this.maxReconnectDelay;
    console.debug(`[SubtitleWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isIntentionalClose && this.currentOptions) {
        this.connect(this.currentOptions);
      }
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  sendAudioChunk(chunk: ArrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(chunk);
    }
  }

  sendSpeechText(text: string, language?: string, isFinal = true, confidence = 0.9) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated && text.trim()) {
      // Hybrid protocol: client_transcript bypasses server STT (desktop / browser recognition).
      this.ws.send(
        JSON.stringify({
          type: 'client_transcript',
          text: text.trim(),
          sourceLanguage: language,
          language,
          isFinal,
          confidence,
        }),
      );
    }
  }

  sendConfig(payload: SubtitleConfigPayload): void;
  sendConfig(domain: string, initialPrompt?: string, extra?: SubtitleConfigExtra): void;
  sendConfig(
    domainOrPayload: string | SubtitleConfigPayload,
    initialPrompt = '',
    extra: SubtitleConfigExtra = {},
  ) {
    const payload = typeof domainOrPayload === 'string'
      ? { domain: domainOrPayload, initialPrompt, ...extra }
      : domainOrPayload;
    this.currentConfig = payload;

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(
        JSON.stringify({
          type: 'config',
          domain: payload.domain,
          initialPrompt: payload.initialPrompt || '',
          translationTier: payload.translationTier || 'standard',
          byokEnabled: payload.byokEnabled ?? false,
          byokProvider: payload.byokProvider || 'openai',
          byokApiKey: payload.byokApiKey || '',
        })
      );
    }
  }

  subscribe(callback: SubtitleCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeToPipelineStatus(callback: PipelineStatusCallback): () => void {
    this.pipelineStatusListeners.add(callback);
    return () => this.pipelineStatusListeners.delete(callback);
  }

  disconnect() {
    this.isIntentionalClose = true;
    this.isAuthenticated = false;
    this.currentOptions = null;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const subtitleWsService = new SubtitleWebSocketService();
