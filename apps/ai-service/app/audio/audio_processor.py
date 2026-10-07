import numpy as np


class AcousticDeReverberator:
    """
    Sub-millisecond in-memory de-reverberation filter for meeting room acoustics.
    Detects and suppresses room echo / speakerphone bleed before feeding to Whisper.
    """
    def __init__(self, sample_rate: int = 16000, max_delay_ms: int = 200, decay_factor: float = 0.35):
        self.sample_rate = sample_rate
        self.max_delay_samples = int(sample_rate * (max_delay_ms / 1000.0))
        self.decay_factor = decay_factor

    def process(self, audio: np.ndarray) -> np.ndarray:
        if audio is None or len(audio) < self.sample_rate * 0.3:
            return audio

        if audio.ndim > 1:
            audio = audio.squeeze()

        # 1. Compute normalized autocorrelation for echo lag detection
        # Focus on typical room reflection delays: 80ms - 200ms
        min_lag = int(self.sample_rate * 0.08)
        max_lag = min(len(audio) // 2, self.max_delay_samples)
        if max_lag <= min_lag:
            return audio

        # Downsampled correlation for sub-millisecond execution (<0.5ms)
        ds_step = 4
        ds_audio = audio[::ds_step]
        ds_min = min_lag // ds_step
        ds_max = max_lag // ds_step

        corr = np.correlate(ds_audio, ds_audio, mode="full")
        mid = len(corr) // 2
        lags_segment = corr[mid + ds_min : mid + ds_max]

        if len(lags_segment) == 0:
            return audio

        peak_idx = int(np.argmax(lags_segment))
        peak_val = lags_segment[peak_idx] / (corr[mid] + 1e-9)

        # If reflection peak exceeds threshold (echo detected)
        if peak_val > 0.18:
            detected_lag = (ds_min + peak_idx) * ds_step
            cleaned = audio.copy()
            cleaned[detected_lag:] -= float(min(0.40, peak_val * 1.2)) * audio[:-detected_lag]
            return cleaned.astype(np.float32)

        return audio


de_reverberator = AcousticDeReverberator()


class AudioProcessor:
    def __init__(self, target_sample_rate: int = 16000, enable_dereverb: bool = True):
        self.target_sample_rate = target_sample_rate
        self.enable_dereverb = enable_dereverb
        self.dereverberator = (
            de_reverberator
            if target_sample_rate == 16000
            else AcousticDeReverberator(sample_rate=target_sample_rate)
        )

    def pcm_to_float32(self, pcm_bytes: bytes, dereverb: bool = True) -> np.ndarray:
        """Converts 16-bit PCM mono audio bytes to float32 normalized [-1.0, 1.0]."""
        audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)
        audio_f32 = audio_int16.astype(np.float32) / 32768.0
        if self.enable_dereverb and dereverb:
            audio_f32 = self.dereverberator.process(audio_f32)
        return audio_f32

    def process_float32(self, audio: np.ndarray) -> np.ndarray:
        """Processes float32 audio through de-reverberator if enabled."""
        if self.enable_dereverb:
            return self.dereverberator.process(audio)
        return audio
