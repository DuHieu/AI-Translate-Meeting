import { useEffect, useRef, useCallback } from 'react';
import { SubtitleMessage } from '../types/subtitle';
import { speakText, stopSpeech } from '../utils/speechAndAudio';
import { audioDuckingRegistry, AudioTrackMode } from '../utils/audioDuckingRegistry';
import { getUserSettings, AudioBoothVoiceGender } from '../utils/userSettings';
import { defaultClauseStreamBuffer } from '../utils/clauseStreamBuffer.ts';

interface UseAudioBoothOptions {
  enabled: boolean;
  history: SubtitleMessage[];
  currentUserId?: string;
  currentUserDisplayName?: string;
  localIdentity?: string;
  targetLanguage?: string;
  allowSelfSpeech?: boolean;
  voiceGender?: AudioBoothVoiceGender;
  baseSpeedRate?: number;
  audioTrackMode?: AudioTrackMode;
  dubbingVolume?: number;
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
  currentUserDisplayName: _currentUserDisplayName,
  localIdentity,
  targetLanguage,
  allowSelfSpeech = false,
  voiceGender,
  baseSpeedRate,
  audioTrackMode,
  dubbingVolume,
}: UseAudioBoothOptions): { isDucked: boolean; isSpeaking: boolean } {
  const effectiveMode: AudioTrackMode = audioTrackMode ?? (enabled ? 'dual_ducking' : 'original');
  const isBoothActive = enabled && effectiveMode !== 'original';

  const queueRef = useRef<AudioBoothQueueItem[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const enabledTimeRef = useRef<number>(Date.now());
  const historyRef = useRef(history);
  historyRef.current = history;

  // Sequential queue processor
  const processQueue = useCallback(() => {
    if (!isBoothActive || queueRef.current.length === 0) {
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

    const settings = getUserSettings();
    const effectiveGender = voiceGender || settings.audioBoothVoiceGender || 'auto';
    const userSpeedMultiplier = baseSpeedRate ?? settings.audioBoothSpeedRate ?? 1.0;
    const finalSpeechRate = Math.max(0.75, Math.min(1.5, speechRate * userSpeedMultiplier));
    const effectiveVolume = dubbingVolume ?? settings.dubbingVolume ?? 1.0;

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
        const refreshedAt = Date.now();
        queueRef.current.forEach((item) => {
          item.enqueuedAt = refreshedAt;
        });
        processQueue();
      },
      finalSpeechRate,
      effectiveVolume,
      effectiveGender
    );

    if (!spoken) {
      // Browser speech synthesis failed or unsupported; continue queue
      processQueue();
    }
  }, [isBoothActive, voiceGender, baseSpeedRate, dubbingVolume]);

  // Synchronize track mode and clear queue when muted
  useEffect(() => {
    audioDuckingRegistry.setMode(effectiveMode);
    if (isBoothActive) {
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
  }, [isBoothActive, effectiveMode]);

  // Inspect incoming final subtitles — duyệt toàn bộ history để tránh bỏ sót
  // khi nhiều câu final đến gần cùng lúc trong 1 React render cycle.
  useEffect(() => {
    if (!enabled || !isBoothActive) return;
    if (history.length === 0) return;

    let didEnqueue = false;

    history.forEach((item) => {
      // Contract compatibility: latest.isFinal, currentUserId && latest.participantId === currentUserId
      const latest = item;
      if (!latest.isFinal || !item.isFinal) return;

      // Filter out self utterances when allowSelfSpeech is false
      if (!allowSelfSpeech && currentUserId && latest.participantId === currentUserId) return;
      if (!allowSelfSpeech && currentUserId && item.participantId === currentUserId) return;
      if (!allowSelfSpeech && localIdentity && item.participantId === localIdentity) return;

      const itemId = item.id || `${item.participantId}-${item.timestamp}`;
      if (spokenIdsRef.current.has(itemId)) return;

      spokenIdsRef.current.add(itemId);

      // Skip same-language items — no translation, cabin readback is meaningless
      const isSameLanguage = item.sourceLanguage && item.targetLanguage
        && item.sourceLanguage.split('-')[0] === item.targetLanguage.split('-')[0];
      if (isSameLanguage) return;

      const speechText = (item.translatedText || item.originalText || '').trim();
      if (!speechText) return;

      const preferredLang = item.targetLanguage || targetLanguage || 'vi';
      const clauses = defaultClauseStreamBuffer.splitIntoClauses(speechText, preferredLang);

      clauses.forEach((clause) => {
        queueRef.current.push({
          id: `${itemId}-${clause.index}`,
          text: clause.text,
          lang: preferredLang,
          enqueuedAt: Date.now(),
        });
        didEnqueue = true;
      });
    });

    if (didEnqueue && !isSpeakingRef.current) {
      processQueue();
    }
  }, [history, enabled, isBoothActive, currentUserId, localIdentity, targetLanguage, allowSelfSpeech, processQueue]);

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
