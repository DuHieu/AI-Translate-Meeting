import { useEffect, useRef, useCallback } from 'react';
import { SubtitleMessage } from '../types/subtitle';
import { speakText, stopSpeech } from '../utils/speechAndAudio';
import { audioDuckingRegistry } from '../utils/audioDuckingRegistry';

interface UseAudioBoothOptions {
  enabled: boolean;
  history: SubtitleMessage[];
  currentUserId?: string;
  targetLanguage?: string;
}

interface AudioBoothQueueItem {
  id: string;
  text: string;
  lang: string;
  enqueuedAt: number;
}

/**
 * Hook for Client-side Simultaneous Translation Audio Booth.
 * Uses Web Speech API (zero-server-cost) with automated sequential queue
 * and Web Audio/Media -18dB ducking of remote speakers.
 *
 * Guardrails enforced:
 * 1. Only speaks isFinal=true utterances.
 * 2. Filters out self utterances (never speaks participant's own speech).
 * 3. Drops stale utterances queued > 2.5s ago to prevent accumulating conversational lag.
 * 4. Smoothly ducks remote participant audio while speaking, restores on completion/error/unmount.
 */
export function useAudioBooth({
  enabled,
  history,
  currentUserId,
  targetLanguage,
}: UseAudioBoothOptions): { isDucked: boolean; isSpeaking: boolean } {
  const queueRef = useRef<AudioBoothQueueItem[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const enabledTimeRef = useRef<number>(Date.now());
  const historyRef = useRef(history);
  historyRef.current = history;

  // Sequential queue processor
  const processQueue = useCallback(() => {
    if (!enabled || queueRef.current.length === 0) {
      isSpeakingRef.current = false;
      audioDuckingRegistry.setDucked(false);
      return;
    }

    const nextItem = queueRef.current.shift();
    if (!nextItem) {
      isSpeakingRef.current = false;
      audioDuckingRegistry.setDucked(false);
      return;
    }

    // Guardrail: Drop stale utterances (> 2.5s lag) to keep up with live turn-taking
    const ageMs = Date.now() - nextItem.enqueuedAt;
    if (ageMs > 2500) {
      console.debug('[AudioBooth] Dropping stale queue item (> 2.5s):', nextItem.text.slice(0, 30));
      processQueue();
      return;
    }

    // Dynamic speech rate calculation:
    // 1.0x baseline; ramp to 1.12x - 1.25x if queue backlog or long sentence
    const pendingCount = queueRef.current.length;
    let speechRate = 1.0;
    if (pendingCount > 1 || ageMs > 800) {
      speechRate = 1.25;
    } else if (pendingCount === 1 || nextItem.text.length > 50) {
      speechRate = 1.12;
    }

    isSpeakingRef.current = true;
    audioDuckingRegistry.setDucked(true);

    const spoken = speakText(
      nextItem.text,
      nextItem.lang,
      () => {
        // Speech started
      },
      () => {
        // Speech ended or errored
        processQueue();
      },
      speechRate
    );

    if (!spoken) {
      // Browser speech synthesis failed or unsupported; continue queue
      processQueue();
    }
  }, [enabled]);

  // Record timestamp when audio booth is toggled on to ignore backlog
  useEffect(() => {
    if (enabled) {
      enabledTimeRef.current = Date.now();
      // Mark existing history as already seen so we don't burst playback on enable
      historyRef.current.forEach((item) => {
        const id = item.id || `${item.participantId}-${item.timestamp}`;
        spokenIdsRef.current.add(id);
      });
    } else {
      // Clear queue and immediately unduck audio
      queueRef.current = [];
      isSpeakingRef.current = false;
      stopSpeech();
      audioDuckingRegistry.setDucked(false);
    }
  }, [enabled]);

  // Inspect incoming final subtitles
  useEffect(() => {
    if (!enabled) return;

    if (history.length === 0) return;

    const latest = history[history.length - 1];
    if (!latest || !latest.isFinal) return;

    // Filter out self utterances
    if (currentUserId && latest.participantId === currentUserId) return;

    const itemId = latest.id || `${latest.participantId}-${latest.timestamp}`;
    if (spokenIdsRef.current.has(itemId)) return;

    spokenIdsRef.current.add(itemId);

    const speechText = (latest.translatedText || latest.originalText || '').trim();
    if (!speechText) return;

    const preferredLang = latest.targetLanguage || targetLanguage || 'vi';

    queueRef.current.push({
      id: itemId,
      text: speechText,
      lang: preferredLang,
      enqueuedAt: Date.now(),
    });

    if (!isSpeakingRef.current) {
      processQueue();
    }
  }, [history, enabled, currentUserId, targetLanguage, processQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      queueRef.current = [];
      isSpeakingRef.current = false;
      stopSpeech();
      audioDuckingRegistry.setDucked(false);
    };
  }, []);

  return {
    isDucked: audioDuckingRegistry.getDucked(),
    isSpeaking: isSpeakingRef.current,
  };
}
