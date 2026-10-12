import { useState, useEffect, useCallback, useRef } from 'react';
import { PipelineStatusMessage, SubtitleMessage } from '../types/subtitle';
import { subtitleWsService } from '../services/subtitleService';
import { playActionNotificationChime } from '../utils/speechAndAudio';
import { getUserSettings, subscribeUserSettings, UserMeetingSettings } from '../utils/userSettings';
import { ttsEngine } from '../utils/speechSynthesis';
import { startSubtitleAudioCapture } from './subtitleAudioCapture';

const SUBTITLE_HISTORY_LIMIT = 200;

interface UseSubtitleOptions {
  subtitleToken: string;
  participantName: string;
  sourceLanguage: string;
  targetLanguage: string;
  isMicOn?: boolean;
  isAiReady?: boolean;
  isProPlan?: boolean;
  audioTrack?: MediaStreamTrack | null;
}

export function useSubtitle(meetingId?: string, participantId?: string, options?: UseSubtitleOptions) {
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleMessage | null>(null);
  const [activeSubtitles, setActiveSubtitles] = useState<SubtitleMessage[]>([]);
  const [history, setHistory] = useState<SubtitleMessage[]>([]);
  const [pipelineStatuses, setPipelineStatuses] = useState<Record<string, PipelineStatusMessage>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const exportHistoryRef = useRef<SubtitleMessage[]>([]);
  const recognitionActiveRef = useRef(false);

  const participantName = options?.participantName;
  const subtitleToken = options?.subtitleToken;
  const sourceLanguage = options?.sourceLanguage;
  const targetLanguage = options?.targetLanguage;
  const isMicOn = options?.isMicOn;
  const isAiReady = options?.isAiReady;
  const isProPlan = options?.isProPlan ?? false;
  const audioTrack = options?.audioTrack;
  const sourceLanguageRef = useRef(sourceLanguage);
  sourceLanguageRef.current = sourceLanguage;

  // 1. Manage WebSocket connection and subtitle incoming messages
  useEffect(() => {
    if (!meetingId || !participantId || !subtitleToken || !participantName || !sourceLanguage || !targetLanguage) return;

    const overlayTimers: Record<string, number> = {};

    subtitleWsService.connect({
      meetingId,
      participantId,
      subtitleToken,
      participantName,
      sourceLanguage,
      targetLanguage,
      domain: getUserSettings().glossaryDomain,
      initialPrompt: localStorage.getItem('ai-meeting-initial-prompt') || '',
    });

    ttsEngine.setLanguage(targetLanguage);

    const unsubscribe = subtitleWsService.subscribe((msg: SubtitleMessage) => {
      // Ignore synthetic connection-acknowledgement frame sent on WebSocket handshake
      if (msg.confidence === 0 && msg.originalText === 'Xin chào, chúng ta bắt đầu cuộc họp nhé.') {
        return;
      }

      const showInterim = getUserSettings().showInterimSubtitles;
      if (!msg.isFinal && !showInterim) {
        return;
      }

      // History and exports only record finalized sentences for clean minutes
      if (msg.isFinal) {
        const exportIndex = exportHistoryRef.current.findIndex((item) => item.id === msg.id);
        if (exportIndex >= 0) {
          exportHistoryRef.current[exportIndex] = msg;
        } else {
          exportHistoryRef.current.push(msg);
        }

        setHistory((prev) => {
          const existingIdx = prev.findIndex((item) => item.id === msg.id);
          if (existingIdx >= 0) {
            const next = [...prev];
            next[existingIdx] = msg;
            return next;
          }
          return [...prev, msg].slice(-SUBTITLE_HISTORY_LIMIT);
        });
      }

      // Live subtitle banner reflects both interim ghosting and final committed subtitles
      setActiveSubtitle(msg);
      setActiveSubtitles((prev) => {
        const existingIdx = prev.findIndex((item) => item.id === msg.id || item.participantId === msg.participantId);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = msg;
          return next;
        }
        return [...prev, msg].slice(-3);
      });

      // Play subtle chime on action items or decisions
      if (msg.isFinal && msg.tags && msg.tags.length > 0 && (msg.confidence ?? 0) >= 0.75) {
        if (localStorage.getItem('ai-action-chime-enabled') !== 'false') {
          playActionNotificationChime();
        }
      }

      if (msg.isFinal && msg.participantId !== participantId) {
        ttsEngine.speak(msg.translatedText);
      }

      // Auto-clear overlay after 7 seconds per utterance
      if (overlayTimers[msg.id]) {
        window.clearTimeout(overlayTimers[msg.id]);
      }
      overlayTimers[msg.id] = window.setTimeout(() => {
        setActiveSubtitles((current) => current.filter((item) => item.id !== msg.id));
        setActiveSubtitle((current) => (current?.id === msg.id ? null : current));
        delete overlayTimers[msg.id];
      }, 7000);
    });

    const unsubscribeStatus = subtitleWsService.subscribeToPipelineStatus((status: PipelineStatusMessage) => {
      const key = status.liveKitIdentity || status.participantId;
      setPipelineStatuses((prev) => {
        if (status.phase === 'ready' || status.phase === 'failed') {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: status };
      });
    });

    // Auto-clear expired pipeline statuses every 2 seconds
    const statusSweepTimer = window.setInterval(() => {
      const now = new Date().getTime();
      setPipelineStatuses((prev) => {
        let changed = false;
        const next: Record<string, PipelineStatusMessage> = {};
        for (const [k, v] of Object.entries(prev)) {
          const exp = new Date(v.expiresAt).getTime();
          if (isNaN(exp) || exp > now) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      Object.values(overlayTimers).forEach((timerId) => window.clearTimeout(timerId));
      window.clearInterval(statusSweepTimer);
      unsubscribe();
      unsubscribeStatus();
      subtitleWsService.disconnect();
    };
  }, [meetingId, participantId, subtitleToken, participantName, sourceLanguage, targetLanguage]);

  // Sync translation engine, Pro entitlement and BYOK changes without reloading the meeting.
  useEffect(() => {
    if (!meetingId || !participantId) return;

    const syncTranslationConfig = (settings: UserMeetingSettings) => {
      subtitleWsService.sendConfig({
        domain: settings.glossaryDomain,
        initialPrompt: localStorage.getItem('ai-meeting-initial-prompt') || '',
        translationTier: isProPlan ? 'pro' : settings.translationTier,
        byokEnabled: settings.byokEnabled,
        byokProvider: settings.byokProvider,
        byokApiKey: settings.byokEnabled ? settings.byokApiKey : '',
      });
    };

    syncTranslationConfig(getUserSettings());
    return subscribeUserSettings(syncTranslationConfig);
  }, [meetingId, participantId, isProPlan, subtitleToken, sourceLanguage, targetLanguage]);

  // 2. Microphone streaming via dedicated AudioWorklet VAD capture module
  useEffect(() => {
    if (!isMicOn || !isAiReady) {
      setIsSpeaking(false);
      return;
    }

    if (!audioTrack || audioTrack.readyState !== 'live') {
      console.debug('[useSubtitle] Awaiting active LiveKit microphone track...');
      return;
    }

    const capture = startSubtitleAudioCapture({
      audioTrack,
      getSourceLanguage: () => sourceLanguageRef.current,
      isRecognitionBlocking: () => recognitionActiveRef.current,
      setRecognitionBlocking: (active) => {
        recognitionActiveRef.current = active;
      },
      onSpeakingChange: setIsSpeaking,
    });

    return () => {
      capture.dispose();
      setIsSpeaking(false);
    };
  }, [isMicOn, isAiReady, audioTrack]);

  const sendSpeechText = useCallback(
    (text: string) => {
      subtitleWsService.sendSpeechText(text, sourceLanguage);
    },
    [sourceLanguage],
  );

  const getExportHistory = useCallback(() => [...exportHistoryRef.current], []);

  return {
    activeSubtitle,
    activeSubtitles,
    history,
    getExportHistory,
    sendSpeechText,
    pipelineStatuses,
    isSpeaking,
  };
}
