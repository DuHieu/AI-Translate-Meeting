import numpy as np


class VoiceActivityDetector:
    """
    Real-time energy and RMS based Voice Activity Detector for audio chunks.
    Filters out background silence, keystrokes, and empty buffers.
    """

    def __init__(self, energy_threshold: float = 0.00015, rms_threshold: float = 0.006):
        self.energy_threshold = energy_threshold
        self.rms_threshold = rms_threshold

    def calculate_energy(self, audio_data: np.ndarray) -> tuple[float, float]:
        if audio_data is None or len(audio_data) == 0:
            return 0.0, 0.0
        energy = float(np.mean(audio_data ** 2))
        rms = float(np.sqrt(energy))
        return energy, rms

    def contains_speech(self, audio_data: np.ndarray) -> bool:
        """Determines if the audio chunk contains voice activity."""
        if audio_data is None or len(audio_data) == 0:
            return False
        energy, rms = self.calculate_energy(audio_data)
        if rms <= self.rms_threshold and energy <= self.energy_threshold:
            return False
        # Human speech exhibits dynamic peaks; reject flat stationary background hiss
        peak = float(np.max(np.abs(audio_data)))
        if peak < self.rms_threshold * 1.4:
            return False
        return True
