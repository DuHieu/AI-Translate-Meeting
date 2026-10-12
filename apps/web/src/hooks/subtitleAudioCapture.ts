import { subtitleWsService } from '../services/subtitleService';
import { getUserSettings } from '../utils/userSettings';

export const AUDIO_CHUNK_MS = 350;
export const PCM_SAMPLE_RATE = 16000;
export const VAD_HANGOVER_CHUNKS = 2;
export const VAD_RMS_THRESHOLDS = {
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

function appendFloat32(left: Float32Array, right: Float32Array): Float32Array {
  const joined = new Float32Array(left.length + right.length);
  joined.set(left);
  joined.set(right, left.length);
  return joined;
}

export function downsampleToPcm16(input: Float32Array, inputSampleRate: number): Int16Array {
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

export function calculateRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let index = 0; index < samples.length; index++) {
    sumSquares += samples[index] * samples[index];
  }
  return Math.sqrt(sumSquares / samples.length);
}

export interface SubtitleAudioCaptureOptions {
  audioTrack: MediaStreamTrack;
  getSourceLanguage: () => string | undefined;
  isRecognitionBlocking: () => boolean;
  setRecognitionBlocking: (active: boolean) => void;
  onSpeakingChange: (isSpeaking: boolean) => void;
}

export interface SubtitleAudioCaptureHandle {
  dispose: () => void;
}

/**
 * Captures LiveKit mic audio, gates with AudioWorklet VAD (ScriptProcessor / MediaRecorder fallback),
 * and optionally offloads final transcripts via browser SpeechRecognition.
 */
export function startSubtitleAudioCapture(
  options: SubtitleAudioCaptureOptions,
): SubtitleAudioCaptureHandle {
  const {
    audioTrack,
    getSourceLanguage,
    isRecognitionBlocking,
    setRecognitionBlocking,
    onSpeakingChange,
  } = options;

  let mediaStream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let ownsTracks = false;
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let vadNode: AudioWorkletNode | null = null;
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
  const hangoverChunks = VAD_HANGOVER_CHUNKS;

  let lastRecognitionResultAt = 0;
  let accumulatedSentenceParts: string[] = [];
  let sentenceFlushTimer: number | null = null;
  const SENTENCE_COMPLETION_DEBOUNCE_MS = 650;

  const sendPcmWithVad = (pcm: Int16Array, rms: number) => {
    if (!subtitleWsService.isConnected() || isRecognitionBlocking()) return;

    const buffer = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
    if (rms > vadThreshold) {
      if (!speechActive) {
        preRollChunks.forEach((chunk) => subtitleWsService.sendAudioChunk(chunk));
        preRollChunks = [];
      }
      speechActive = true;
      silenceChunksCount = 0;
      onSpeakingChange(true);
      subtitleWsService.sendAudioChunk(buffer);
      return;
    }

    if (speechActive && silenceChunksCount < hangoverChunks) {
      silenceChunksCount += 1;
      subtitleWsService.sendAudioChunk(buffer);
      if (silenceChunksCount >= hangoverChunks) {
        speechActive = false;
        preRollChunks = [];
        onSpeakingChange(false);
      }
      return;
    }

    preRollChunks.push(buffer);
    preRollChunks = preRollChunks.slice(-2);
  };

  const flushAccumulatedSentence = () => {
    if (sentenceFlushTimer !== null) {
      window.clearTimeout(sentenceFlushTimer);
      sentenceFlushTimer = null;
    }
    if (accumulatedSentenceParts.length === 0) return;
    const completeSentence = accumulatedSentenceParts.join(' ').replace(/\s+/g, ' ').trim();
    accumulatedSentenceParts = [];
    if (completeSentence) {
      subtitleWsService.sendSpeechText(completeSentence, getSourceLanguage(), true);
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
    const configuredLanguage = getSourceLanguage();
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
        setRecognitionBlocking(true);
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
      setRecognitionBlocking(false);
      if (['audio-capture', 'not-allowed', 'service-not-allowed'].includes(event.error)) {
        recognitionShouldRestart = false;
      }
    };
    recognition.onend = () => {
      recognitionActive = false;
      setRecognitionBlocking(false);
      if (!disposed && recognitionShouldRestart) {
        recognitionRestartTimer = window.setTimeout(() => {
          try {
            recognition?.start();
          } catch {
            recognitionActive = false;
            setRecognitionBlocking(false);
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
      setRecognitionBlocking(false);
    }
  };

  const attachScriptProcessorFallback = () => {
    if (!audioCtx || !sourceNode || typeof audioCtx.createScriptProcessor !== 'function') {
      return false;
    }

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
        setRecognitionBlocking(false);
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
        sendPcmWithVad(
          downsampleToPcm16(frame, audioCtx?.sampleRate ?? PCM_SAMPLE_RATE),
          calculateRms(frame),
        );
      }
    };

    sourceNode.connect(processorNode);
    processorNode.connect(silentOutput);
    silentOutput.connect(audioCtx.destination);
    return true;
  };

  const attachMediaRecorderFallback = (stream: MediaStream) => {
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
        if (isRecognitionBlocking() || !subtitleWsService.isConnected()) return;

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
          onSpeakingChange(true);
          subtitleWsService.sendAudioChunk(buffer);
        } else if (speechActive && silenceChunksCount < hangoverChunks) {
          silenceChunksCount += 1;
          subtitleWsService.sendAudioChunk(buffer);
          if (silenceChunksCount >= hangoverChunks) {
            speechActive = false;
            onSpeakingChange(false);
          }
        }
      };
      recorder.start(AUDIO_CHUNK_MS);
    } catch (e) {
      console.warn('[subtitleAudioCapture] MediaRecorder init failed:', e);
    }
  };

  const startRecording = async (stream: MediaStream, isOwned: boolean) => {
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
      console.debug('[subtitleAudioCapture] AudioContext init skipped/failed:', e);
    }

    let workletAttached = false;
    if (audioCtx && sourceNode && typeof audioCtx.audioWorklet?.addModule === 'function') {
      try {
        await audioCtx.audioWorklet.addModule('/audio-processors/vad-processor.js');
        if (disposed || !audioCtx || !sourceNode) return;

        vadNode = new AudioWorkletNode(audioCtx, 'vad-audio-processor');
        vadNode.port.postMessage({
          type: 'CONFIG',
          rmsThreshold: vadThreshold,
          maxHangover: VAD_HANGOVER_CHUNKS,
        });
        vadNode.port.onmessage = (event: MessageEvent) => {
          const payload = event.data || {};
          if (typeof payload.isSpeaking === 'boolean') {
            onSpeakingChange(payload.isSpeaking);
          }
          if (
            payload.type === 'SPEECH_CHUNK' &&
            payload.data &&
            subtitleWsService.isConnected() &&
            !isRecognitionBlocking()
          ) {
            subtitleWsService.sendAudioChunk(payload.data as ArrayBuffer);
          }
        };

        silentOutput = audioCtx.createGain();
        silentOutput.gain.value = 0;
        sourceNode.connect(vadNode);
        vadNode.connect(silentOutput);
        silentOutput.connect(audioCtx.destination);
        workletAttached = true;
      } catch (e) {
        console.debug('[subtitleAudioCapture] AudioWorklet VAD unavailable, falling back:', e);
        vadNode = null;
      }
    }

    if (!workletAttached) {
      if (!attachScriptProcessorFallback()) {
        attachMediaRecorderFallback(stream);
      }
    }

    startBrowserRecognition();
  };

  const stream = new MediaStream([audioTrack]);
  void startRecording(stream, false);

  return {
    dispose: () => {
      disposed = true;
      recognitionShouldRestart = false;
      setRecognitionBlocking(false);
      onSpeakingChange(false);
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
          console.warn('[subtitleAudioCapture] MediaRecorder stop failed:', err);
        }
      }
      if (vadNode) {
        try { vadNode.port.onmessage = null; } catch { /* ignore */ }
        try { vadNode.disconnect(); } catch { /* ignore */ }
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
    },
  };
}
