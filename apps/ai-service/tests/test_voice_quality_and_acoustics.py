import numpy as np
import pytest

from app.audio.audio_processor import AcousticDeReverberator, AudioProcessor
from app.audio.quality_filter import SpeechQualityFilter
from app.audio.vad import VoiceActivityDetector


# ==============================================================================
# Helper functions to synthesize test audio waveforms (16kHz mono)
# ==============================================================================
def make_clean_voice_audio(duration_sec: float = 1.0, sr: int = 16000) -> np.ndarray:
    """Simulates a clear human voice waveform with natural fundamental & formant harmonics."""
    t = np.linspace(0, duration_sec, int(sr * duration_sec), endpoint=False)
    # Speech-like synthetic harmonic audio signal
    signal = (
        0.50 * np.sin(2 * np.pi * 440 * t)
        + 0.30 * np.sin(2 * np.pi * 880 * t)
        + 0.20 * np.sin(2 * np.pi * 1320 * t)
    )
    return signal.astype(np.float32)


def make_silent_audio(duration_sec: float = 1.0, sr: int = 16000) -> np.ndarray:
    """Simulates pure digital silence."""
    return np.zeros(int(sr * duration_sec), dtype=np.float32)


def make_background_noise_audio(duration_sec: float = 1.0, sr: int = 16000, rms_amp: float = 0.001) -> np.ndarray:
    """Simulates low-level ambient HVAC or room noise."""
    np.random.seed(42)
    noise = np.random.normal(0, rms_amp, int(sr * duration_sec))
    return noise.astype(np.float32)


def make_clipped_distorted_audio(duration_sec: float = 1.0, sr: int = 16000) -> np.ndarray:
    """Simulates loud, clipped audio (mic gain too high / saturation)."""
    clean = make_clean_voice_audio(duration_sec, sr) * 5.0
    return np.clip(clean, -1.0, 1.0).astype(np.float32)


def make_reverberant_echo_audio(clean: np.ndarray, sr: int = 16000, delay_ms: float = 150.0, decay_factor: float = 0.35) -> np.ndarray:
    """Simulates speech inside an echoey meeting room with speakerphone reflections."""
    delay_samples = int(sr * (delay_ms / 1000.0))
    echo_signal = clean.copy()
    if delay_samples < len(echo_signal):
        echo_signal[delay_samples:] += decay_factor * clean[:-delay_samples]
    return echo_signal.astype(np.float32)


# ==============================================================================
# 1. VOICE ACTIVITY DETECTION (VAD) - GOOD vs BAD AUDIO
# ==============================================================================
def test_vad_accepts_good_clean_voice():
    """Good voice with audible speech energy must reliably trigger contains_speech=True."""
    vad = VoiceActivityDetector()
    good_voice = make_clean_voice_audio(duration_sec=0.35)
    energy, rms = vad.calculate_energy(good_voice)

    assert rms > 0.05, f"Expected clear RMS for clean voice, got {rms}"
    assert vad.contains_speech(good_voice) is True


def test_vad_rejects_silent_and_low_ambient_noise():
    """Bad audio: Pure silence and low-level background noise must be rejected as contains_speech=False."""
    vad = VoiceActivityDetector(rms_threshold=0.003)

    # 1. Pure silence
    silent = make_silent_audio(duration_sec=0.35)
    assert vad.contains_speech(silent) is False

    # 2. Quiet HVAC / room background noise (< 0.0015 RMS)
    ambient_noise = make_background_noise_audio(duration_sec=0.35, rms_amp=0.0008)
    assert vad.contains_speech(ambient_noise) is False


def test_vad_handles_clipping_without_crash():
    """Bad audio: Saturated / clipped microphone audio should still compute finite energy."""
    vad = VoiceActivityDetector()
    clipped = make_clipped_distorted_audio(duration_sec=0.35)

    assert np.all(np.isfinite(clipped))
    energy, rms = vad.calculate_energy(clipped)
    assert np.isfinite(energy) and np.isfinite(rms)
    assert vad.contains_speech(clipped) is True


# ==============================================================================
# 2. DE-REVERBERATION FILTER - ECHOEY (BAD) vs CLEAN (GOOD) VOICE
# ==============================================================================
def test_dereverberator_attenuates_speakerphone_echo():
    """Bad audio: Room echo / 150ms acoustic reflection must be actively suppressed."""
    sr = 16000
    clean = make_clean_voice_audio(duration_sec=1.0, sr=sr)
    echoey = make_reverberant_echo_audio(clean, sr=sr, delay_ms=150.0, decay_factor=0.35)

    dereverb = AcousticDeReverberator(sample_rate=sr)
    cleaned = dereverb.process(echoey)

    mse_echoey = float(np.mean((echoey - clean) ** 2))
    mse_cleaned = float(np.mean((cleaned - clean) ** 2))

    assert mse_cleaned < mse_echoey, "De-reverberator failed to reduce room reflection error"


# ==============================================================================
# 3. SPEECH QUALITY GUARDRAIL - MEANINGFUL (GOOD) vs PATHOLOGICAL (BAD) VOICE
# ==============================================================================
@pytest.mark.parametrize(
    "good_text, lang",
    [
        ("Chào mọi người, hôm nay chúng ta review sprint mới.", "vi"),
        ("Chúng tôi đã tối ưu hóa xong độ trễ của hệ thống.", "vi"),
        ("Let's review the architectural decision record for this release.", "en"),
        ("The deployment succeeded without any downtime.", "en"),
        ("こんにちは、本日の議題について共有いたします。", "ja"),
        ("データベースの移行が正常に完了しました。", "ja"),
    ],
)
def test_quality_filter_accepts_good_meaningful_voice(good_text, lang):
    """Good voice: Normal business & engineering utterances must be approved."""
    q_filter = SpeechQualityFilter()
    is_valid, reason = q_filter.filter_speech(good_text, language=lang)

    assert is_valid is True, f"Valid sentence was incorrectly rejected: '{good_text}', reason: {reason}"
    assert reason == ""


@pytest.mark.parametrize(
    "bad_text, lang, expected_reason",
    [
        # Whisper Phantom Hallucinations (YouTube outros, watermark phrases)
        ("Cảm ơn các bạn đã theo dõi video.", "vi", "whisper_hallucination"),
        ("Hãy like và subscribe kênh của mình nha.", "vi", "whisper_hallucination"),
        ("Thank you for watching, please subscribe!", "en", "whisper_hallucination"),
        ("Subtitles by the Amara.org community", "en", "whisper_hallucination"),
        ("ご視聴ありがとうございました。チャンネル登録お願いします。", "ja", "whisper_hallucination"),
        # Pure Hesitation & Fillers (No semantic value)
        ("ừm...", "vi", "pure_filler"),
        ("à ờ ừm", "vi", "pure_filler"),
        ("um uh...", "en", "pure_filler"),
        ("ええと", "ja", "pure_filler"),
        ("あの", "ja", "pure_filler"),
        # Acoustic Annotations & Noise
        ("♪ ♫ ♪", "vi", "acoustic_noise"),
        ("[tiếng ho]", "vi", "acoustic_noise"),
        ("[applause]", "en", "acoustic_noise"),
        # Stuttering Repetition Loops
        ("đúng rồi đúng rồi đúng rồi đúng rồi", "vi", "repetition_loop"),
        ("wait wait wait wait wait", "en", "repetition_loop"),
        ("わかりましたわかりましたわかりましたわかりました", "ja", "repetition_loop"),
    ],
)
def test_quality_filter_rejects_bad_pathological_voice(bad_text, lang, expected_reason):
    """Bad voice: Hallucinations, pure fillers, coughs, and stuttering loops must be blocked."""
    q_filter = SpeechQualityFilter()
    is_valid, reason = q_filter.filter_speech(bad_text, language=lang)

    assert is_valid is False, f"Pathological sentence was not blocked: '{bad_text}'"
    assert reason == expected_reason, f"Expected reason '{expected_reason}', got '{reason}' for '{bad_text}'"


# ==============================================================================
# 4. AUDIO PROCESSOR PCM16 CONVERSION & CORRUPTION RESILIENCE
# ==============================================================================
def test_audio_processor_handles_pcm_conversion():
    """Verifies AudioProcessor accurately maps 16-bit PCM to normalized float32."""
    processor = AudioProcessor(enable_dereverb=False)

    # 1. Good valid 16-bit PCM bytes
    samples_int16 = np.array([0, 16384, -16384, 32767, -32768], dtype=np.int16)
    pcm_bytes = samples_int16.tobytes()

    f32_out = processor.pcm_to_float32(pcm_bytes, dereverb=False)
    assert len(f32_out) == 5
    assert np.isclose(f32_out[0], 0.0, atol=1e-4)
    assert np.isclose(f32_out[1], 0.5, atol=1e-3)
    assert np.isclose(f32_out[2], -0.5, atol=1e-3)
    assert np.isclose(f32_out[3], 1.0, atol=1e-3)
    assert np.isclose(f32_out[4], -1.0, atol=1e-3)


def test_audio_processor_handles_empty_pcm():
    """Bad audio: Empty or zero-length buffer must safely produce empty array without crashing."""
    processor = AudioProcessor()
    empty_out = processor.pcm_to_float32(b"")
    assert len(empty_out) == 0
