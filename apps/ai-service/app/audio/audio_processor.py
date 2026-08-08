import numpy as np

class AudioProcessor:
    def __init__(self, target_sample_rate: int = 16000):
        self.target_sample_rate = target_sample_rate

    def pcm_to_float32(self, pcm_bytes: bytes) -> np.ndarray:
        """Converts 16-bit PCM mono audio bytes to float32 normalized [-1.0, 1.0]."""
        audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)
        return audio_int16.astype(np.float32) / 32768.0
