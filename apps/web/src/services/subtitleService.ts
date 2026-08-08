import { SubtitleMessage } from '../types/subtitle';

type SubtitleCallback = (msg: SubtitleMessage) => void;

export class SubtitleWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<SubtitleCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private isIntentionalClose = false;

  connect(meetingId: string, participantId: string) {
    this.isIntentionalClose = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/transcribe?meetingId=${meetingId}&participantId=${participantId}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[SubtitleWS] Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'subtitle' || data.id) {
            this.listeners.forEach((cb) => cb(data));
          }
        } catch (err) {
          console.error('[SubtitleWS] Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        if (!this.isIntentionalClose) {
          this.scheduleReconnect(meetingId, participantId);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[SubtitleWS] Error:', err);
      };
    } catch (err) {
      console.error('[SubtitleWS] Connection exception:', err);
      this.scheduleReconnect(meetingId, participantId);
    }
  }

  private scheduleReconnect(meetingId: string, participantId: string) {
    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 5s, 10s, capped at 30s
    const delays = [1000, 2000, 5000, 10000];
    const delay = delays[this.reconnectAttempts - 1] || this.maxReconnectDelay;
    console.log(`[SubtitleWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => {
      if (!this.isIntentionalClose) {
        this.connect(meetingId, participantId);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const subtitleWsService = new SubtitleWebSocketService();
