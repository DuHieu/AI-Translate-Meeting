import { useState, useEffect, useCallback } from 'react';
import { PipelineStatusMessage, SubtitleMessage } from '../types/subtitle';
import { subtitleWsService } from '../services/subtitleService';
import { playActionNotificationChime } from '../utils/speechAndAudio';

const SUBTITLE_HISTORY_LIMIT = 200;
const AUDIO_CHUNK_MS = 350;

interface UseSubtitleOptions {
  subtitleToken: string;
  participantName: string;
  sourceLanguage: string;
  targetLanguage: string;
  isMicOn?: boolean;
  isAiReady?: boolean;
  audioTrack?: MediaStreamTrack | null;
}

export function useSubtitle(meetingId?: string, participantId?: string, options?: UseSubtitleOptions) {
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleMessage | null>(null);
  const [activeSubtitles, setActiveSubtitles] = useState<SubtitleMessage[]>([]);
  const [history, setHistory] = useState<SubtitleMessage[]>([]);
  const [pipelineStatuses, setPipelineStatuses] = useState<Record<string, PipelineStatusMessage>>({});

  const participantName = options?.participantName;
  const subtitleToken = options?.subtitleToken;
  const sourceLanguage = options?.sourceLanguage;
  const targetLanguage = options?.targetLanguage;
  const isMicOn = options?.isMicOn;
  const isAiReady = options?.isAiReady;
  const audioTrack = options?.audioTrack;

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
      domain: localStorage.getItem('ai-meeting-domain') || 'engineering',
      initialPrompt: localStorage.getItem('ai-meeting-initial-prompt') || '',
    });

    const unsubscribe = subtitleWsService.subscribe((msg: SubtitleMessage) => {
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

      setHistory((prev) => {
        const existingIdx = prev.findIndex((item) => item.id === msg.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = msg;
          return next;
        }
        return [...prev, msg].slice(-SUBTITLE_HISTORY_LIMIT);
      });

      // Play subtle chime on action items or decisions
      if (msg.isFinal && msg.tags && msg.tags.length > 0 && (msg.confidence ?? 0) >= 0.75) {
        if (localStorage.getItem('ai-action-chime-enabled') !== 'false') {
          playActionNotificationChime();
        }
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


  // 2. Microphone live audio streaming to STT/Subtitle service
  // Re-uses LiveKit's existing audio track if provided to avoid hardware conflicts
  useEffect(() => {
    if (!isMicOn || !isAiReady) return;

    let mediaStream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let ownsTracks = false;

    const startRecording = (stream: MediaStream, isOwned: boolean) => {
      mediaStream = stream;
      ownsTracks = isOwned;
      try {
        const mimeType =
          typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';

        recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = async (event) => {
          if (event.data && event.data.size > 0 && subtitleWsService.isConnected()) {
            const buffer = await event.data.arrayBuffer();
            subtitleWsService.sendAudioChunk(buffer);
          }
        };
        recorder.start(AUDIO_CHUNK_MS);
      } catch (e) {
        console.warn('[useSubtitle] MediaRecorder init failed:', e);
      }
    };

    if (audioTrack && audioTrack.readyState === 'live') {
      // Direct stream from LiveKit audio track (strictly single-source, zero duplicate getUserMedia)
      const stream = new MediaStream([audioTrack]);
      startRecording(stream, false);
    } else {
      console.debug('[useSubtitle] Awaiting active LiveKit microphone track...');
    }

    return () => {
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (err) {
          console.warn('[useSubtitle] MediaRecorder stop failed:', err);
        }
      }
      if (ownsTracks && mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isMicOn, isAiReady, audioTrack]);

  const sendSpeechText = useCallback(
    (text: string) => {
      subtitleWsService.sendSpeechText(text, sourceLanguage);
    },
    [sourceLanguage],
  );

  return { activeSubtitle, activeSubtitles, history, sendSpeechText, pipelineStatuses };
}

