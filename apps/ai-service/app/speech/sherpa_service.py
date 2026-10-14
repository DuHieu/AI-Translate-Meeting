import asyncio
import io
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Union
import numpy as np

from app.config.settings import settings
from app.speech.whisper_service import (
    TranscriptResult,
    detect_text_language,
    normalize_language_code,
)

logger = logging.getLogger("ai_service.sherpa")


@dataclass(frozen=True)
class SherpaReadiness:
    state: str  # "not_started", "loading", "ready", "failed"
    load_duration_ms: float | None = None
    error_code: str | None = None
    model_name: str | None = None


# Default files for csukuangfj/sherpa-onnx-streaming-zipformer-ar_en_id_ja_ru_th_vi_zh-2025-02-10
DEFAULT_SHERPA_FILES = [
    "tokens.txt",
    "encoder-epoch-75-avg-11-chunk-16-left-128.int8.onnx",
    "decoder-epoch-75-avg-11-chunk-16-left-128.onnx",
    "joiner-epoch-75-avg-11-chunk-16-left-128.int8.onnx",
    "bpe.model",
]


class SherpaStreamingService:
    """Self-hosted Streaming Conformer-RNN-T / Zipformer speech recognition using sherpa-onnx.

    Modeled after Google Meet / USM streaming transducer architecture:
    - Zero cloud dependency ($0 API cost).
    - True monotonic streaming recognition (160ms chunks, low TTFS).
    - Multi-language support (vi, ja, en, zh, th, id, ru, ar).
    - Thread-safe stream management for concurrent participants.
    """

    def __init__(
        self,
        model_dir: Optional[str] = None,
        model_repo: Optional[str] = None,
        num_threads: Optional[int] = None,
        auto_download: Optional[bool] = None,
        decoding_method: Optional[str] = None,
    ):
        self.model_dir = Path(
            model_dir or getattr(settings, "SHERPA_MODEL_DIR", "models/sherpa-onnx-streaming-zipformer-ar_en_id_ja_ru_th_vi_zh-2025-02-10")
        )
        self.model_repo = model_repo or getattr(
            settings,
            "SHERPA_MODEL_REPO",
            "csukuangfj/sherpa-onnx-streaming-zipformer-ar_en_id_ja_ru_th_vi_zh-2025-02-10",
        )
        self.num_threads = num_threads or getattr(settings, "SHERPA_CPU_THREADS", 2)
        self.auto_download = (
            auto_download
            if auto_download is not None
            else getattr(settings, "SHERPA_AUTO_DOWNLOAD", True)
        )
        self.decoding_method = decoding_method or getattr(
            settings, "SHERPA_DECODING_METHOD", "greedy_search"
        )

        self._recognizer = None
        self._load_lock = asyncio.Lock()
        self._readiness_state = "not_started"
        self._load_duration_ms: float | None = None
        self._load_error_code: str | None = None

    def get_readiness(self) -> SherpaReadiness:
        return SherpaReadiness(
            state=self._readiness_state,
            load_duration_ms=self._load_duration_ms,
            error_code=self._load_error_code,
            model_name=self.model_repo,
        )

    def _find_model_files(self) -> dict[str, Path | None]:
        """Discovers transducer model files in the configured model directory."""
        if not self.model_dir.exists():
            return {"tokens": None, "encoder": None, "decoder": None, "joiner": None, "bpe": None}

        tokens_file = None
        encoder_file = None
        decoder_file = None
        joiner_file = None
        bpe_file = None

        for p in self.model_dir.iterdir():
            if not p.is_file():
                continue
            name = p.name.lower()
            if name.endswith("tokens.txt"):
                tokens_file = p
            elif name.endswith("bpe.model"):
                bpe_file = p
            elif "encoder" in name and name.endswith(".onnx"):
                if encoder_file is None or ".int8.onnx" in name:
                    encoder_file = p
            elif "decoder" in name and name.endswith(".onnx"):
                if decoder_file is None or ".int8.onnx" in name:
                    decoder_file = p
            elif "joiner" in name and name.endswith(".onnx"):
                if joiner_file is None or ".int8.onnx" in name:
                    joiner_file = p

        return {
            "tokens": tokens_file,
            "encoder": encoder_file,
            "decoder": decoder_file,
            "joiner": joiner_file,
            "bpe": bpe_file,
        }

    async def _download_file(self, filename: str) -> bool:
        """Asynchronously downloads a single model file from Hugging Face Hub using httpx."""
        import httpx

        url = f"https://huggingface.co/{self.model_repo}/resolve/main/{filename}"
        dest_path = self.model_dir / filename
        temp_path = self.model_dir / f"{filename}.tmp"

        self.model_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Downloading Sherpa-ONNX model file from %s to %s", url, dest_path)

        try:
            async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
                async with client.stream("GET", url) as response:
                    if response.status_code != 200:
                        logger.error(
                            "Failed to download %s: HTTP %s", filename, response.status_code
                        )
                        return False
                    with open(temp_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                            f.write(chunk)

            temp_path.replace(dest_path)
            logger.info("Successfully downloaded %s (%d bytes)", filename, dest_path.stat().st_size)
            return True
        except Exception as ex:
            logger.warning("Error downloading Sherpa model file %s: %s", filename, ex)
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass
            return False

    async def _ensure_model_files(self) -> dict[str, Path]:
        """Ensures all required transducer files are present, downloading them if auto_download is enabled."""
        files = self._find_model_files()

        required_keys = ["tokens", "encoder", "decoder", "joiner"]
        missing = [k for k in required_keys if files.get(k) is None]

        if missing and self.auto_download:
            logger.info(
                "Sherpa-ONNX model files missing (%s); attempting auto-download from %s...",
                missing,
                self.model_repo,
            )
            for fname in DEFAULT_SHERPA_FILES:
                target = self.model_dir / fname
                if not target.exists():
                    ok = await self._download_file(fname)
                    if not ok and fname != "bpe.model":
                        raise RuntimeError(f"Failed to download required model file: {fname}")

            # Re-scan after download
            files = self._find_model_files()
            missing = [k for k in required_keys if files.get(k) is None]

        if missing:
            raise FileNotFoundError(
                f"Missing required Sherpa-ONNX model files: {missing} in {self.model_dir}"
            )

        return {k: files[k] for k in required_keys if files[k] is not None}

    def _load_recognizer_sync(self, model_paths: dict[str, Path]):
        """Synchronously creates the sherpa_onnx.OnlineRecognizer."""
        import sherpa_onnx

        logger.info(
            "Loading sherpa-onnx OnlineRecognizer model_dir=%s threads=%d decoding=%s",
            self.model_dir,
            self.num_threads,
            self.decoding_method,
        )

        bpe_vocab = ""
        bpe_file = self.model_dir / "bpe.model"
        if bpe_file.exists():
            bpe_vocab = str(bpe_file)

        return sherpa_onnx.OnlineRecognizer.from_transducer(
            tokens=str(model_paths["tokens"]),
            encoder=str(model_paths["encoder"]),
            decoder=str(model_paths["decoder"]),
            joiner=str(model_paths["joiner"]),
            bpe_vocab=bpe_vocab,
            num_threads=self.num_threads,
            sample_rate=16000,
            feature_dim=80,
            decoding_method=self.decoding_method,
            provider="cpu",
        )

    async def preload(self, retry_failed: bool = False) -> SherpaReadiness:
        """Preloads the Sherpa-ONNX OnlineRecognizer."""
        async with self._load_lock:
            if self._recognizer is not None:
                self._readiness_state = "ready"
                self._load_error_code = None
                return self.get_readiness()

            if self._readiness_state == "failed" and not retry_failed:
                return self.get_readiness()

            self._readiness_state = "loading"
            self._load_error_code = None
            t0 = time.perf_counter()

            try:
                model_paths = await self._ensure_model_files()
                recognizer = await asyncio.to_thread(self._load_recognizer_sync, model_paths)
                self._recognizer = recognizer
                self._load_duration_ms = (time.perf_counter() - t0) * 1000
                self._readiness_state = "ready"
                logger.info(
                    "Sherpa-ONNX streaming recognizer ready in %.1fms", self._load_duration_ms
                )
            except Exception as ex:
                self._load_duration_ms = (time.perf_counter() - t0) * 1000
                self._readiness_state = "failed"
                self._load_error_code = type(ex).__name__
                logger.warning(
                    "Sherpa-ONNX model load failed (error=%s: %s). STT will use fallback engine.",
                    type(ex).__name__,
                    ex,
                )

            return self.get_readiness()

    def create_stream(self):
        """Creates a new streaming session for a speaker."""
        if self._recognizer is None:
            raise RuntimeError("Sherpa-ONNX recognizer is not initialized")
        return self._recognizer.create_stream()

    @staticmethod
    def _to_float32_mono(audio: Union[bytes, bytearray, memoryview, np.ndarray]) -> np.ndarray:
        """Converts incoming audio buffer to 1D float32 mono array in [-1.0, 1.0]."""
        if isinstance(audio, np.ndarray):
            arr = np.asarray(audio, dtype=np.float32)
            if arr.ndim > 1:
                arr = arr.reshape(-1)
            # If values exceed 1.5, assume 16-bit integer scale
            if len(arr) > 0 and (np.max(arr) > 1.5 or np.min(arr) < -1.5):
                arr = arr / 32768.0
            return arr

        if isinstance(audio, (bytes, bytearray, memoryview)):
            raw = bytes(audio)
            if len(raw) == 0:
                return np.zeros(0, dtype=np.float32)
            if len(raw) >= 4 and raw[:4] in (b"RIFF", b"OggS", b"\x1a\x45\xdf\xa3"):
                try:
                    from faster_whisper.audio import decode_audio
                    return decode_audio(io.BytesIO(raw), sampling_rate=16000)
                except Exception:
                    pass
            if len(raw) % 2 != 0:
                raw = raw[: len(raw) - (len(raw) % 2)]
            pcm = np.frombuffer(raw, dtype="<i2")
            return pcm.astype(np.float32) / 32768.0

        raise TypeError(f"Unsupported audio type for SherpaStreamingService: {type(audio)!r}")

    def _transcribe_stream_sync(
        self,
        stream: Any,
        waveform: np.ndarray,
        is_final: bool = False,
    ) -> str:
        """Feeds waveform into the stream and decodes available frames."""
        if len(waveform) > 0:
            stream.accept_waveform(16000, waveform.tolist())

        if is_final:
            stream.input_finished()

        while self._recognizer.is_ready(stream):
            self._recognizer.decode_stream(stream)

        return self._recognizer.get_result(stream).strip()

    async def transcribe_stream_chunk(
        self,
        stream: Any,
        audio: Union[bytes, np.ndarray],
        is_final: bool = False,
    ) -> str:
        """Asynchronously feeds an audio chunk to a persistent stream and returns the latest hypothesis."""
        waveform = self._to_float32_mono(audio)
        return await asyncio.to_thread(self._transcribe_stream_sync, stream, waveform, is_final)

    def _transcribe_batch_sync(
        self,
        waveform: np.ndarray,
        language: str = "vi",
        is_final: bool = True,
        candidate_languages: Optional[list[str]] = None,
    ) -> TranscriptResult:
        """Executes a complete single-shot transcription of an audio buffer."""
        if len(waveform) == 0:
            return TranscriptResult(text="", language=language, is_final=is_final, language_probability=0.0)

        stream = self._recognizer.create_stream()
        stream.accept_waveform(16000, waveform.tolist())
        stream.input_finished()

        while self._recognizer.is_ready(stream):
            self._recognizer.decode_stream(stream)

        raw_text = self._recognizer.get_result(stream).strip()
        if not raw_text:
            return TranscriptResult(text="", language=language, is_final=is_final, language_probability=0.0)

        # Detect spoken language from the recognized text script
        detected_lang, confidence = detect_text_language(raw_text, fallback_lang=language)

        # Candidate language constraint (Google Meet style)
        if candidate_languages and detected_lang not in candidate_languages:
            if language in candidate_languages:
                detected_lang = language

        return TranscriptResult(
            text=raw_text,
            language=detected_lang,
            is_final=is_final,
            language_probability=confidence,
        )

    async def transcribe(
        self,
        audio: Union[bytes, np.ndarray],
        *,
        language: Optional[str] = "vi",
        is_final: bool = True,
        initial_prompt: Optional[str] = None,
        candidate_languages: Optional[list[str]] = None,
        **kwargs: Any,
    ) -> TranscriptResult:
        """Asynchronously transcribes audio buffer using Sherpa-ONNX streaming Zipformer."""
        target_lang = normalize_language_code(language, fallback="vi")

        if self._recognizer is None:
            await self.preload(retry_failed=False)
            if self._recognizer is None:
                raise RuntimeError(f"Sherpa-ONNX recognizer not ready: {self._load_error_code}")

        waveform = self._to_float32_mono(audio)
        if len(waveform) == 0:
            return TranscriptResult(text="", language=target_lang, is_final=is_final, language_probability=0.0)

        return await asyncio.to_thread(
            self._transcribe_batch_sync,
            waveform,
            target_lang,
            is_final,
            candidate_languages,
        )
