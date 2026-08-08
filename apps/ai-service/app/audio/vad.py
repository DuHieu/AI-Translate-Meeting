import numpy as np

class VoiceActivityDetector:
    def __init__(self, threshold: float = 0.01):
        self.threshold = threshold

    def contains_speech(self, audio_data: np.ndarray) -> bool:
        """Simple energy-based VAD for audio buffer evaluation."""
        if audio_data is None or len(audio_data) == 0:
            return False
        energy = np.mean(audio_data ** 2)
        return energy > self.threshold
