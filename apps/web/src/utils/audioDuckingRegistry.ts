/**
 * Centralized Audio Ducking Registry for WebRTC Remote Media Streams.
 * When client-side translation TTS (Simultaneous Audio Booth) is active,
 * remote participant voices are ducked to ~0.18 (-15dB to -18dB) smoothly,
 * preventing speech collision and acoustic overload.
 */

type DuckingListener = (isDucked: boolean) => void;

class AudioDuckingRegistry {
  private elements = new Set<HTMLMediaElement>();
  private isDucked = false;
  private listeners = new Set<DuckingListener>();

  /**
   * Register a newly attached remote HTMLMediaElement (audio/video).
   */
  register(element: HTMLMediaElement): void {
    this.elements.add(element);
    element.volume = this.isDucked ? 0.18 : 1.0;
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
   * Set ducking state with a smooth 180ms ramp.
   * Target volume: 0.18 (-15dB to -18dB) when ducked, 1.0 when normal.
   */
  setDucked(ducked: boolean): void {
    if (this.isDucked === ducked) return;
    this.isDucked = ducked;

    const targetVolume = ducked ? 0.18 : 1.0;
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
