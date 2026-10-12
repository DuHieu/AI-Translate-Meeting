/**
 * Client-side VAD AudioWorklet: ring-buffer 350ms @ 16kHz PCM,
 * energy + zero-crossing gate, hangover, silence offload (0 bytes on silence).
 */
class VadAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.chunkSize = 5600; // 350ms @ 16kHz
    this.buffer = new Float32Array(this.chunkSize);
    this.bufferIndex = 0;
    this.isSpeaking = false;
    this.silenceHangover = 0;
    this.maxHangover = 2;
    this.rmsThreshold = 0.006;
    this.preRoll = [];
    this.maxPreRoll = 2;
    this.resampleFrac = 0;

    this.port.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type === 'CONFIG') {
        if (typeof msg.rmsThreshold === 'number' && msg.rmsThreshold > 0) {
          this.rmsThreshold = msg.rmsThreshold;
        }
        if (typeof msg.maxHangover === 'number' && msg.maxHangover >= 0) {
          this.maxHangover = Math.floor(msg.maxHangover);
        }
      }
    };
  }

  static get parameterDescriptors() {
    return [];
  }

  _monoFrame(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return null;
    const channelCount = input.length;
    const frameLength = input[0]?.length || 0;
    if (frameLength === 0) return null;

    const mono = new Float32Array(frameLength);
    for (let ch = 0; ch < channelCount; ch++) {
      const channel = input[ch];
      if (!channel) continue;
      for (let i = 0; i < frameLength; i++) {
        mono[i] += channel[i] / channelCount;
      }
    }
    return mono;
  }

  _pushResampled(mono) {
    const ratio = sampleRate / this.targetSampleRate;
    if (!Number.isFinite(ratio) || ratio <= 0) return;

    let position = this.resampleFrac;
    while (position < mono.length) {
      const i0 = Math.floor(position);
      const i1 = Math.min(i0 + 1, mono.length - 1);
      const frac = position - i0;
      const sample = mono[i0] * (1 - frac) + mono[i1] * frac;
      this.buffer[this.bufferIndex++] = sample;
      position += ratio;

      if (this.bufferIndex >= this.chunkSize) {
        this._emitChunk(this.buffer);
        this.buffer = new Float32Array(this.chunkSize);
        this.bufferIndex = 0;
      }
    }
    this.resampleFrac = position - mono.length;
  }

  _analyze(frame) {
    let sumSq = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < frame.length; i++) {
      const sample = frame[i];
      sumSq += sample * sample;
      if (i > 0 && (sample >= 0) !== (frame[i - 1] >= 0)) {
        zeroCrossings += 1;
      }
    }
    const rms = Math.sqrt(sumSq / frame.length);
    const zcr = zeroCrossings / frame.length;
    // Enough energy for speech; reject hiss-like ultra-high ZCR.
    return rms > this.rmsThreshold && zcr < 0.4;
  }

  _floatToInt16Buffer(frame) {
    const pcm = new Int16Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const clipped = Math.max(-1, Math.min(1, frame[i]));
      pcm[i] = clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
    }
    return pcm.buffer;
  }

  _emitSpeech(frame) {
    const buffer = this._floatToInt16Buffer(frame);
    this.port.postMessage(
      { type: 'SPEECH_CHUNK', data: buffer, isSpeaking: true },
      [buffer],
    );
  }

  _emitChunk(frame) {
    const voiced = this._analyze(frame);

    if (voiced) {
      if (!this.isSpeaking) {
        for (let i = 0; i < this.preRoll.length; i++) {
          this._emitSpeech(this.preRoll[i]);
        }
        this.preRoll = [];
      }
      this.isSpeaking = true;
      this.silenceHangover = 0;
      this._emitSpeech(frame);
      return;
    }

    if (this.isSpeaking && this.silenceHangover < this.maxHangover) {
      this.silenceHangover += 1;
      this._emitSpeech(frame);
      if (this.silenceHangover >= this.maxHangover) {
        this.isSpeaking = false;
        this.preRoll = [];
        this.port.postMessage({ type: 'SILENCE_HEARTBEAT', isSpeaking: false });
      }
      return;
    }

    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.port.postMessage({ type: 'SILENCE_HEARTBEAT', isSpeaking: false });
    }

    // Silence: keep short pre-roll only; never send PCM bytes to the main thread.
    this.preRoll.push(Float32Array.from(frame));
    if (this.preRoll.length > this.maxPreRoll) {
      this.preRoll.shift();
    }
  }

  process(inputs) {
    const mono = this._monoFrame(inputs);
    if (mono) {
      this._pushResampled(mono);
    }
    return true;
  }
}

registerProcessor('vad-audio-processor', VadAudioProcessor);
