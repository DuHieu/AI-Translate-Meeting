import { useState, useEffect, useCallback, useRef } from 'react';
import { PipelineStatusMessage, SubtitleMessage } from '../types/subtitle';
import { subtitleWsService } from '../services/subtitleService';
import { playActionNotificationChime } from '../utils/speechAndAudio';
import { getUserSettings, subscribeUserSettings, UserMeetingSettings } from '../utils/userSettings';
import { ttsEngine } from '../utils/speechSynthesis';

const SUBTITLE_HISTORY_LIMIT = 200;
const AUDIO_CHUNK_MS = 350;
const PCM_SAMPLE_RATE = 16000;
const VAD_RMS_THRESHOLDS = {
  low: 0.003,
  medium: 0.006,
  high: 0.011,
} as const;

interface BrowserSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function appendFloat32(left: Float32Array, right: Float32Array): Float32Array {
  const joined = new Float32Array(left.length + right.length);
  joined.set(left);
  joined.set(right, left.length);
  return joined;
}

function downsampleToPcm16(input: Float32Array, inputSampleRate: number): Int16Array {
  const outputLength = Math.max(1, Math.round((input.length * PCM_SAMPLE_RATE) / inputSampleRate));
  const output = new Int16Array(outputLength);
  const ratio = input.length / outputLength;

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex++) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.max(start + 1, Math.min(input.length, Math.floor((outputIndex + 1) * ratio)));
    let sum = 0;
    for (let inputIndex = start; inputIndex < end; inputIndex++) {
      sum += input[inputIndex];
    }
    const sample = Math.max(-1, Math.min(1, sum / (end - start)));
    output[outputIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output;
}

function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index++) {
    sumSquares += samples[index] * samples[index];
  }
  return Math.sqrt(sumSquares / samples.length);
}

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
  const exportHistoryRef = useRef<SubtitleMessage[]>([]);

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

      // Chỉ hiển thị và lưu trữ bản phụ đề hoàn chỉnh (final), loại bỏ hoàn toàn hiện tượng hiển thị bản interim sai/dở dang trước đó
      if (!msg.isFinal) {
        return;
      }

      const exportIndex = exportHistoryRef.current.findIndex((item) => item.id === msg.id);
      if (exportIndex >= 0) {
        exportHistoryRef.current[exportIndex] = msg;
      } else {
        exportHistoryRef.current.push(msg);
      }

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


  // 2. Microphone live audio streaming to STT/Subtitle service
  // Re-uses LiveKit's existing audio track if provided to avoid hardware conflicts
  useEffect(() => {
    if (!isMicOn || !isAiReady) return;

    let mediaStream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let ownsTracks = false;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let processorNode: ScriptProcessorNode | null = null;
    let silentOutput: GainNode | null = null;
    let recognition: BrowserSpeechRecognition | null = null;
    let recognitionRestartTimer: number | null = null;
    let recognitionActive = false;
    let recognitionShouldRestart = true;
    let disposed = false;
    let pendingSamples: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let speechActive = false;
    let silenceChunksCount = 0;
    let preRollChunks: ArrayBuffer[] = [];
    let initialWebmFrame: ArrayBuffer | null = null;
    let webmHeaderSent = false;

    const vadSensitivity = getUserSettings().vadSensitivity;
    const vadThreshold = VAD_RMS_THRESHOLDS[vadSensitivity] ?? VAD_RMS_THRESHOLDS.medium;
    const hangoverChunks = 3;

    const sendPcmWithVad = (pcm: Int16Array, rms: number) => {
      if (!subtitleWsService.isConnected() || recognitionActive) return;

      const buffer = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
      if (rms > vadThreshold) {
        if (!speechActive) {
          preRollChunks.forEach((chunk) => subtitleWsService.sendAudioChunk(chunk));
          preRollChunks = [];
        }
        speechActive = true;
        silenceChunksCount = 0;
        subtitleWsService.sendAudioChunk(buffer);
        return;
      }

      if (speechActive && silenceChunksCount < hangoverChunks) {
        silenceChunksCount += 1;
        subtitleWsService.sendAudioChunk(buffer);
        if (silenceChunksCount >= hangoverChunks) {
          speechActive = false;
          preRollChunks = [];
        }
        return;
      }

      preRollChunks.push(buffer);
      preRollChunks = preRollChunks.slice(-2);
    };

    const SPEECH_RECOGNITION_BCP47: Record<string, string> = {
      vi: 'vi-VN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
    };
    let lastRecognitionResultAt = 0;
    let accumulatedSentenceParts: string[] = [];
    let sentenceFlushTimer: number | null = null;
    const SENTENCE_COMPLETION_DEBOUNCE_MS = 650;

    const flushAccumulatedSentence = () => {
      if (sentenceFlushTimer !== null) {
        window.clearTimeout(sentenceFlushTimer);
        sentenceFlushTimer = null;
      }
      if (accumulatedSentenceParts.length === 0) return;
      const completeSentence = accumulatedSentenceParts.join(' ').replace(/\s+/g, ' ').trim();
      accumulatedSentenceParts = [];
      if (completeSentence) {
        subtitleWsService.sendSpeechText(
          completeSentence,
          sourceLanguageRef.current,
          true,
        );
      }
    };

    const startBrowserRecognition = () => {
      const speechWindow = window as typeof window & {
        SpeechRecognition?: BrowserSpeechRecognitionConstructor;
        webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
      };
      const RecognitionConstructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      if (!RecognitionConstructor) return;

      recognition = new RecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      const configuredLanguage = sourceLanguageRef.current;
      if (configuredLanguage && configuredLanguage !== 'auto') {
        recognition.lang = SPEECH_RECOGNITION_BCP47[configuredLanguage.toLowerCase()] || configuredLanguage;
      } else {
        recognition.lang = 'vi-VN';
      }
      recognition.onstart = () => {
        pendingSamples = new Float32Array(0);
      };
      recognition.onresult = (event) => {
        let hasInterim = false;
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index];
          const transcript = result[0]?.transcript?.trim();
          if (!transcript) continue;

          recognitionActive = true;
          lastRecognitionResultAt = Date.now();

          if (result.isFinal) {
            accumulatedSentenceParts.push(transcript);
          } else {
            hasInterim = true;
          }
        }

        if (sentenceFlushTimer !== null) {
          window.clearTimeout(sentenceFlushTimer);
          sentenceFlushTimer = null;
        }

        if (accumulatedSentenceParts.length > 0) {
          const combinedWords = accumulatedSentenceParts.join(' ').split(/\s+/).length;
          const waitMs = !hasInterim && combinedWords >= 20 ? 250 : SENTENCE_COMPLETION_DEBOUNCE_MS;
          sentenceFlushTimer = window.setTimeout(flushAccumulatedSentence, waitMs);
        }
      };
      recognition.onerror = (event) => {
        recognitionActive = false;
        if (['audio-capture', 'not-allowed', 'service-not-allowed'].includes(event.error)) {
          recognitionShouldRestart = false;
        }
      };
      recognition.onend = () => {
        recognitionActive = false;
        if (!disposed && recognitionShouldRestart) {
          recognitionRestartTimer = window.setTimeout(() => {
            try {
              recognition?.start();
            } catch {
              recognitionActive = false;
            }
          }, 250);
        } else {
          flushAccumulatedSentence();
        }
      };

      try {
        recognition.start();
      } catch {
        recognitionActive = false;
      }
    };

    const startRecording = (stream: MediaStream, isOwned: boolean) => {
      mediaStream = stream;
      ownsTracks = isOwned;

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioCtx = new AudioCtx();
          sourceNode = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          sourceNode.connect(analyser);
          if (audioCtx.state === 'suspended') {
            void audioCtx.resume().catch(() => undefined);
          }
        }
      } catch (e) {
        console.debug('[useSubtitle] AudioContext analyser init skipped/failed:', e);
      }

      if (audioCtx && sourceNode && typeof audioCtx.createScriptProcessor === 'function') {
        processorNode = audioCtx.createScriptProcessor(4096, 1, 1);
        silentOutput = audioCtx.createGain();
        silentOutput.gain.value = 0;
        const sourceChunkSamples = Math.max(
          1,
          Math.round((audioCtx.sampleRate * AUDIO_CHUNK_MS) / 1000),
        );

        processorNode.onaudioprocess = (event) => {
          if (recognitionActive && Date.now() - lastRecognitionResultAt < 4000) {
            pendingSamples = new Float32Array(0);
            return;
          }
          if (recognitionActive && Date.now() - lastRecognitionResultAt >= 4000) {
            recognitionActive = false;
          }

          const channelCount = Math.max(1, event.inputBuffer.numberOfChannels);
          const monoSamples = new Float32Array(event.inputBuffer.length);
          for (let channel = 0; channel < channelCount; channel++) {
            const channelData = event.inputBuffer.getChannelData(channel);
            for (let index = 0; index < channelData.length; index++) {
              monoSamples[index] += channelData[index] / channelCount;
            }
          }

          pendingSamples = appendFloat32(pendingSamples, monoSamples);
          while (pendingSamples.length >= sourceChunkSamples) {
            const frame = pendingSamples.slice(0, sourceChunkSamples);
            pendingSamples = pendingSamples.slice(sourceChunkSamples);
            sendPcmWithVad(downsampleToPcm16(frame, audioCtx?.sampleRate ?? PCM_SAMPLE_RATE), calculateRms(frame));
          }
        };

        sourceNode.connect(processorNode);
        processorNode.connect(silentOutput);
        silentOutput.connect(audioCtx.destination);
      } else {
        try {
          const mimeType =
            typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : 'audio/webm';

          recorder = new MediaRecorder(stream, { mimeType });
          recorder.ondataavailable = async (event) => {
            if (!event.data || event.data.size === 0) return;

            const buffer = await event.data.arrayBuffer();
            const isInitialFrame = initialWebmFrame === null;
            if (isInitialFrame) initialWebmFrame = buffer;
            if (recognitionActive || !subtitleWsService.isConnected()) return;

            if (!webmHeaderSent && initialWebmFrame) {
              subtitleWsService.sendAudioChunk(initialWebmFrame);
              webmHeaderSent = true;
              if (isInitialFrame) return;
            }

            let rms = vadThreshold + 1;
            if (analyser) {
              const timeDomain = new Float32Array(analyser.fftSize);
              analyser.getFloatTimeDomainData(timeDomain);
              rms = calculateRms(timeDomain);
            }

            if (rms > vadThreshold) {
              silenceChunksCount = 0;
              speechActive = true;
              subtitleWsService.sendAudioChunk(buffer);
            } else if (speechActive && silenceChunksCount < hangoverChunks) {
              silenceChunksCount += 1;
              subtitleWsService.sendAudioChunk(buffer);
              if (silenceChunksCount >= hangoverChunks) speechActive = false;
            }
          };
          recorder.start(AUDIO_CHUNK_MS);
        } catch (e) {
          console.warn('[useSubtitle] MediaRecorder init failed:', e);
        }
      }

      startBrowserRecognition();
    };

    if (audioTrack && audioTrack.readyState === 'live') {
      // Direct stream from LiveKit audio track (strictly single-source, zero duplicate getUserMedia)
      const stream = new MediaStream([audioTrack]);
      startRecording(stream, false);
    } else {
      console.debug('[useSubtitle] Awaiting active LiveKit microphone track...');
    }

    return () => {
      disposed = true;
      recognitionShouldRestart = false;
      flushAccumulatedSentence();
      if (recognitionRestartTimer !== null) window.clearTimeout(recognitionRestartTimer);
      if (recognition) {
        recognition.onend = null;
        try { recognition.abort(); } catch { /* ignore */ }
      }
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch (err) {
          console.warn('[useSubtitle] MediaRecorder stop failed:', err);
        }
      }
      if (processorNode) {
        processorNode.onaudioprocess = null;
        try { processorNode.disconnect(); } catch { /* ignore */ }
      }
      if (silentOutput) {
        try { silentOutput.disconnect(); } catch { /* ignore */ }
      }
      if (analyser) {
        try { analyser.disconnect(); } catch { /* ignore */ }
      }
      if (sourceNode) {
        try { sourceNode.disconnect(); } catch { /* ignore */ }
      }
      if (audioCtx && audioCtx.state !== 'closed') {
        try { void audioCtx.close(); } catch { /* ignore */ }
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

  const getExportHistory = useCallback(() => [...exportHistoryRef.current], []);

  return { activeSubtitle, activeSubtitles, history, getExportHistory, sendSpeechText, pipelineStatuses };
}
