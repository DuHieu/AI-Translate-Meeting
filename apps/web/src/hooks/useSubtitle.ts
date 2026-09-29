import { useState, useEffect, useCallback } from 'react';
import { SubtitleMessage } from '../types/subtitle';
import { subtitleWsService } from '../services/subtitleService';

const SUBTITLE_HISTORY_LIMIT = 200;
const AUDIO_CHUNK_MS = 1000;

interface UseSubtitleOptions {
  participantName: string;
  sourceLanguage: string;
  targetLanguage: string;
  isMicOn?: boolean;
  audioTrack?: MediaStreamTrack | null;
}

export function useSubtitle(meetingId?: string, participantId?: string, options?: UseSubtitleOptions) {
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleMessage | null>(null);
  const [history, setHistory] = useState<SubtitleMessage[]>([]);
  const participantName = options?.participantName;
  const sourceLanguage = options?.sourceLanguage;
  const targetLanguage = options?.targetLanguage;
  const isMicOn = options?.isMicOn;
  const audioTrack = options?.audioTrack;

  // 1. Manage WebSocket connection and subtitle incoming messages
  useEffect(() => {
    if (!meetingId || !participantId || !participantName || !sourceLanguage || !targetLanguage) return;

    let overlayTimer: number | undefined;

    subtitleWsService.connect({
      meetingId,
      participantId,
      participantName,
      sourceLanguage,
      targetLanguage,
    });

    const unsubscribe = subtitleWsService.subscribe((msg: SubtitleMessage) => {
      setActiveSubtitle(msg);
      setHistory((prev) => {
        const existingIdx = prev.findIndex((item) => item.id === msg.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = msg;
          return next;
        }
        return [...prev, msg].slice(-SUBTITLE_HISTORY_LIMIT);
      });

      // Auto-clear overlay after 7 seconds
      if (overlayTimer) window.clearTimeout(overlayTimer);
      overlayTimer = window.setTimeout(() => {
        setActiveSubtitle((current) => (current?.id === msg.id ? null : current));
      }, 7000);
    });

    return () => {
      if (overlayTimer) window.clearTimeout(overlayTimer);
      unsubscribe();
      subtitleWsService.disconnect();
    };
  }, [meetingId, participantId, participantName, sourceLanguage, targetLanguage]);

  // 2. Microphone live audio streaming to STT/Subtitle service
  // Re-uses LiveKit's existing audio track if provided to avoid hardware conflicts
  useEffect(() => {
    if (!isMicOn) return;

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
  }, [isMicOn, audioTrack]);

  const sendSpeechText = useCallback(
    (text: string) => {
      subtitleWsService.sendSpeechText(text, sourceLanguage);
    },
    [sourceLanguage],
  );

  return { activeSubtitle, history, sendSpeechText };
}
