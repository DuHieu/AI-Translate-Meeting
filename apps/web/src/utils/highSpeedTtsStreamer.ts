import { audioDuckingRegistry } from './audioDuckingRegistry';
import { ClauseChunk, defaultClauseStreamBuffer } from './clauseStreamBuffer';

export interface StreamingDubbingOptions {
  lang: string;
  gender?: 'auto' | 'female' | 'male';
  baseSpeed?: number;
  volume?: number;
  onClauseStart?: (clause: ClauseChunk) => void;
  onClauseEnd?: (clause: ClauseChunk) => void;
  onQueueEmpty?: () => void;
}

interface QueuedClause {
  id: string;
  chunk: ClauseChunk;
  lang: string;
  enqueuedAt: number;
  audioBlobPromise?: Promise<string | null>;
}

export class HighSpeedTtsStreamer {
  private queue: QueuedClause[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private audioUrlCache = new Map<string, string>();

  /**
   * Enqueues a full sentence or paragraph, automatically splits into
   * semantic clauses, and starts pipelined streaming playback.
   */
  public enqueueText(
    text: string,
    options: StreamingDubbingOptions,
  ): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    const clauses = defaultClauseStreamBuffer.splitIntoClauses(trimmed, options.lang);
    if (clauses.length === 0) return;

    for (const chunk of clauses) {
      const id = `clause-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const queuedItem: QueuedClause = {
        id,
        chunk,
        lang: options.lang,
        enqueuedAt: Date.now(),
      };

      // Proactively start pre-fetching audio blob for this clause
      queuedItem.audioBlobPromise = this.prefetchClauseAudio(
        chunk.text,
        options.lang,
        options.gender || 'auto',
      );

      this.queue.push(queuedItem);
    }

    if (!this.isPlaying) {
      void this.playNext(options);
    }
  }

  /**
   * Pre-fetches audio from the streaming TTS endpoint and caches as object URL.
   */
  private async prefetchClauseAudio(
    text: string,
    lang: string,
    gender: 'auto' | 'female' | 'male',
  ): Promise<string | null> {
    const cacheKey = `${lang}:${gender}:${text.trim()}`;
    const cached = this.audioUrlCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      q: text.trim().slice(0, 300),
      tl: lang.split('-')[0].toLowerCase(),
      gender,
      speed: '1.0',
    });

    try {
      const res = await fetch(`/api/translation/tts/stream?${params.toString()}`);
      if (!res.ok) {
        // Fallback to standard endpoint
        const fallbackRes = await fetch(`/api/translation/tts?tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text.slice(0, 200))}`);
        if (!fallbackRes.ok) return null;
        const blob = await fallbackRes.blob();
        const objUrl = URL.createObjectURL(blob);
        this.cacheAudioUrl(cacheKey, objUrl);
        return objUrl;
      }

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      this.cacheAudioUrl(cacheKey, objUrl);
      return objUrl;
    } catch {
      return null;
    }
  }

  private cacheAudioUrl(key: string, url: string): void {
    if (this.audioUrlCache.size >= 100) {
      const oldestKey = this.audioUrlCache.keys().next().value;
      if (oldestKey) {
        const oldUrl = this.audioUrlCache.get(oldestKey);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        this.audioUrlCache.delete(oldestKey);
      }
    }
    this.audioUrlCache.set(key, url);
  }

  private async playNext(options: StreamingDubbingOptions): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      audioDuckingRegistry.setDucked(false);
      options.onQueueEmpty?.();
      return;
    }

    const item = this.queue.shift();
    if (!item) {
      this.isPlaying = false;
      audioDuckingRegistry.setDucked(false);
      return;
    }

    // Drop stale clause queued > 3.0s ago to prevent piling up lag
    const age = Date.now() - item.enqueuedAt;
    if (age > 3000) {
      void this.playNext(options);
      return;
    }

    this.isPlaying = true;
    audioDuckingRegistry.setDucked(true);

    let audioSrc: string | null = null;
    if (item.audioBlobPromise) {
      audioSrc = await item.audioBlobPromise;
    }
    if (!audioSrc) {
      audioSrc = await this.prefetchClauseAudio(item.chunk.text, item.lang, options.gender || 'auto');
    }

    if (!audioSrc) {
      // Audio failed to fetch, continue to next clause
      void this.playNext(options);
      return;
    }

    // Dynamic catch-up speed: ramp up if queue has backlog
    let playbackSpeed = options.baseSpeed || 1.0;
    if (this.queue.length > 2 || age > 1000) {
      playbackSpeed *= 1.25;
    } else if (this.queue.length >= 1) {
      playbackSpeed *= 1.12;
    }
    playbackSpeed = Math.max(0.75, Math.min(1.5, playbackSpeed));

    const audio = new Audio(audioSrc);
    audio.playbackRate = playbackSpeed;
    audio.volume = Math.max(0, Math.min(1.0, options.volume ?? 1.0));
    this.currentAudio = audio;

    options.onClauseStart?.(item.chunk);

    await new Promise<void>((resolve) => {
      let isDone = false;
      const done = () => {
        if (isDone) return;
        isDone = true;
        options.onClauseEnd?.(item.chunk);
        resolve();
      };

      audio.onended = done;
      audio.onerror = done;

      audio.play().catch(() => {
        done();
      });
    });

    this.currentAudio = null;
    void this.playNext(options);
  }

  public stop(): void {
    this.queue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.isPlaying = false;
    audioDuckingRegistry.setDucked(false);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const highSpeedTtsStreamer = new HighSpeedTtsStreamer();
