/**
 * Centralized Audio Ducking Registry for WebRTC Remote Media Streams.
 * When client-side translation TTS (Simultaneous Audio Booth) is active,
 * remote participant voices are ducked to ~0.18 (-15dB to -18dB) smoothly,
 * preventing speech collision and acoustic overload.
 */

export type AudioTrackMode = 'original' | 'translated_only' | 'dual_ducking';
type DuckingListener = (isDucked: boolean) => void;
type TrackModeListener = (mode: AudioTrackMode) => void;

class AudioDuckingRegistry {
  private elements = new Set<HTMLMediaElement>();
  private isDucked = false;
  private duckedVolume = 0.18;
  private mode: AudioTrackMode = 'dual_ducking';
  private listeners = new Set<DuckingListener>();
  private modeListeners = new Set<TrackModeListener>();

  /**
   * Resolves target volume for remote media elements based on active mode and ducking state.
   */
  private resolveTargetVolume(): number {
    if (this.mode === 'translated_only') {
      return 0.0;
    }
    if (this.mode === 'original') {
      return 1.0;
    }
    return this.isDucked ? this.duckedVolume : 1.0;
  }

  /**
   * Register a newly attached remote HTMLMediaElement (audio/video).
   */
  register(element: HTMLMediaElement): void {
    this.elements.add(element);
    element.volume = this.resolveTargetVolume();
  }

  /**
   * Unregister a detached media element and restore standard volume.
   */
  unregister(element: HTMLMediaElement): void {
    try {
      element.volume = 1.0;
    } catch {
      // ignore detached errors
    }
    this.elements.delete(element);
  }

  /**
   * Switch the listening track mode:
   * - 'original': full remote volume (1.0), AI dubbing muted.
   * - 'translated_only': remote audio muted (0.0), AI dubbing 100%.
   * - 'dual_ducking': remote audio ducked (-18dB) when AI speaks, normal when silent.
   */
  setMode(mode: AudioTrackMode): void {
    if (this.mode === mode) return;
    this.mode = mode;

    const targetVolume = this.resolveTargetVolume();
    this.elements.forEach((element) => {
      this.rampVolume(element, targetVolume);
    });

    this.modeListeners.forEach((listener) => {
      try {
        listener(mode);
      } catch (err) {
        console.warn('[AudioDuckingRegistry] Mode listener error:', err);
      }
    });
  }

  getMode(): AudioTrackMode {
    return this.mode;
  }

  subscribeMode(listener: TrackModeListener): () => void {
    this.modeListeners.add(listener);
    return () => {
      this.modeListeners.delete(listener);
    };
  }

  /**
   * Set ducking state with a smooth 180ms ramp.
   * Target volume: duckedVolume (default 0.18, ~-15dB to -18dB) when ducked, 1.0 when normal.
   */
  setDucked(ducked: boolean): void {
    if (this.isDucked === ducked) return;
    this.isDucked = ducked;

    const targetVolume = this.resolveTargetVolume();
    this.elements.forEach((element) => {
      this.rampVolume(element, targetVolume);
    });

    this.listeners.forEach((listener) => {
      try {
        listener(ducked);
      } catch (err) {
        console.warn('[AudioDuckingRegistry] Listener error:', err);
      }
    });
  }

  getDucked(): boolean {
    return this.isDucked;
  }

  getDuckedVolume(): number {
    return this.duckedVolume;
  }

  setDuckedVolume(volume: number): void {
    this.duckedVolume = Math.max(0.05, Math.min(0.5, volume));
    if (this.isDucked && this.mode === 'dual_ducking') {
      this.elements.forEach((element) => {
        this.rampVolume(element, this.duckedVolume);
      });
    }
  }

  subscribe(listener: DuckingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Reset all elements to full volume (e.g. on unmount or meeting leave).
   */
  reset(): void {
    this.isDucked = false;
    this.mode = 'dual_ducking';
    this.elements.forEach((element) => {
      try {
        element.volume = 1.0;
      } catch {
        // ignore
      }
    });
  }

  private rampVolume(element: HTMLMediaElement, targetVolume: number, durationMs = 180): void {
    try {
      const startVolume = element.volume;
      const startTime = performance.now();

      const step = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        element.volume = Math.max(0, Math.min(1, startVolume + (targetVolume - startVolume) * progress));

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    } catch {
      element.volume = targetVolume;
    }
  }
}

export const audioDuckingRegistry = new AudioDuckingRegistry();
