import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure .env is loaded from root or current directory
root_env = Path(__file__).resolve().parents[3] / ".env"
local_env = Path(".env")
if root_env.exists():
    load_dotenv(dotenv_path=root_env)
elif local_env.exists():
    load_dotenv(dotenv_path=local_env)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(root_env if root_env.exists() else ".env"), extra="ignore")

    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "auto")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "auto")
    WHISPER_PRELOAD: bool = os.getenv("WHISPER_PRELOAD", "false").lower() in ("true", "1", "yes")
    WHISPER_DUAL_MODEL_ROUTING: bool = os.getenv(
        "WHISPER_DUAL_MODEL_ROUTING", "true"
    ).lower() in ("true", "1", "yes")
    PHOWHISPER_MODEL_PATH: str = os.getenv(
        "PHOWHISPER_MODEL_PATH", "diepho/PhoWhisper-base-ct2"
    )
    # Cloud STT: "local" or "groq" (OmniLanguageRouter: vi→PhoWhisper, others→Groq + fallbacks).
    # GROQ_API_KEY must never be logged.
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "local")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_STT_MODEL: str = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")
    GROQ_STT_TIMEOUT_SECONDS: float = float(os.getenv("GROQ_STT_TIMEOUT_SECONDS", "3.0"))
    WHISPER_INITIAL_PROMPT: str = os.getenv(
        "WHISPER_INITIAL_PROMPT",
        "Cuộc họp trực tuyến. Chúng tôi trao đổi về công việc, kế hoạch, tiến độ dự án, báo cáo, giải pháp, PR, sprint, bug, deploy.",
    )

    DEFAULT_SOURCE_LANGUAGE: str = os.getenv("DEFAULT_SOURCE_LANGUAGE", "vi")
    DEFAULT_TARGET_LANGUAGE: str = os.getenv("DEFAULT_TARGET_LANGUAGE", "ja")
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
    TRUSTED_PROXY_IPS: str = os.getenv("TRUSTED_PROXY_IPS", "")
    LAYA_SERVICE_URL: str = os.getenv("LAYA_SERVICE_URL", "http://laya:8000")
    LAYA_CONFIDENCE_THRESHOLD: float = float(os.getenv("LAYA_CONFIDENCE_THRESHOLD", "0.80"))
    LAYA_ENABLED: bool = os.getenv("LAYA_ENABLED", "true").lower() in ("true", "1", "yes")
    SUBTITLE_TOKEN_SIGNING_KEY: str = os.getenv("SUBTITLE_TOKEN_SIGNING_KEY", "")
    SUBTITLE_TOKEN_ISSUER: str = os.getenv("SUBTITLE_TOKEN_ISSUER", "ai-translate-meeting-api")
    SUBTITLE_TOKEN_AUDIENCE: str = os.getenv(
        "SUBTITLE_TOKEN_AUDIENCE", "ai-translate-meeting-ai-service"
    )
    WS_MAX_AUDIO_FRAME_BYTES: int = int(os.getenv("WS_MAX_AUDIO_FRAME_BYTES", "131072"))
    WS_MAX_TEXT_FRAME_BYTES: int = int(os.getenv("WS_MAX_TEXT_FRAME_BYTES", "16384"))
    WS_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("WS_RATE_LIMIT_PER_MINUTE", "30"))

    # Context-aware Live Translation settings
    CONTEXTUAL_TRANSLATION_ENABLED: bool = os.getenv("CONTEXTUAL_TRANSLATION_ENABLED", "true").lower() in ("true", "1", "yes")
    TRANSLATION_PROVIDER: str = os.getenv("TRANSLATION_PROVIDER", "contextual")
    TRANSLATION_MODEL: str = os.getenv("TRANSLATION_MODEL", "meeting-v1")
    TRANSLATION_TIMEOUT_MS: int = int(os.getenv("TRANSLATION_TIMEOUT_MS", "3500"))
    TRANSLATION_FALLBACK_PROVIDER: str = os.getenv("TRANSLATION_FALLBACK_PROVIDER", "local")
    TRANSLATION_CONTEXT_MAX_SEGMENTS: int = int(os.getenv("TRANSLATION_CONTEXT_MAX_SEGMENTS", "10"))

    REDIS_URL: str = os.getenv("REDIS_URL", "")
    TRANSLATION_CACHE_ENABLED: bool = os.getenv("TRANSLATION_CACHE_ENABLED", "false").lower() in ("true", "1", "yes")
    TRANSLATION_CACHE_TTL_SECONDS: int = int(os.getenv("TRANSLATION_CACHE_TTL_SECONDS", "86400"))

    TRANSLATION_BACKEND: str = os.getenv("TRANSLATION_BACKEND", "gtx_cloud")
    TRANSLATION_SECONDARY_BACKEND: str = os.getenv(
        "TRANSLATION_SECONDARY_BACKEND", "mymemory"
    )
    OFFLINE_TRANSLATION_URL: str = os.getenv(
        "OFFLINE_TRANSLATION_URL", "http://translation-service:5000/translate"
    )

    # Server-managed premium translation credentials. Values must never be logged.
    PRO_TRANSLATION_PROVIDER: str = os.getenv("PRO_TRANSLATION_PROVIDER", "groq")
    PRO_OPENAI_API_KEY: str = os.getenv("PRO_OPENAI_API_KEY", "")
    PRO_OPENAI_MODEL: str = os.getenv("PRO_OPENAI_MODEL", "gpt-4o-mini")
    PRO_GEMINI_API_KEY: str = os.getenv("PRO_GEMINI_API_KEY", "")
    PRO_GEMINI_MODEL: str = os.getenv("PRO_GEMINI_MODEL", "gemini-3.1-flash-lite")
    PRO_DEEPL_API_KEY: str = os.getenv("PRO_DEEPL_API_KEY", "")
    PRO_MEETING_TOKEN_QUOTA: int = int(os.getenv("PRO_MEETING_TOKEN_QUOTA", "100000"))
    PRO_GRACEFUL_DOWNGRADE_ENABLED: bool = os.getenv(
        "PRO_GRACEFUL_DOWNGRADE_ENABLED", "true"
    ).lower() in ("true", "1", "yes")
    DEFAULT_TRANSLATION_TIER: str = os.getenv("DEFAULT_TRANSLATION_TIER", "pro")

    # Groq — OpenAI-compatible, ~200ms latency, ideal for real-time
    PRO_GROQ_API_KEY: str = os.getenv("PRO_GROQ_API_KEY", "")
    PRO_GROQ_BASE_URL: str = os.getenv("PRO_GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    PRO_GROQ_MODEL: str = os.getenv("PRO_GROQ_MODEL", "qwen/qwen3.8-27b")

    # DeepSeek V3 — OpenAI-compatible, ~10x cheaper than GPT-4
    PRO_DEEPSEEK_API_KEY: str = os.getenv("PRO_DEEPSEEK_API_KEY", "")
    PRO_DEEPSEEK_BASE_URL: str = os.getenv("PRO_DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    PRO_DEEPSEEK_MODEL: str = os.getenv("PRO_DEEPSEEK_MODEL", "deepseek-chat")

    # Qwen-MT — Alibaba DashScope OpenAI-compatible, best for Asian lang pairs (Vi/Zh/Ja)
    PRO_QWEN_API_KEY: str = os.getenv("PRO_QWEN_API_KEY", "")
    PRO_QWEN_BASE_URL: str = os.getenv("PRO_QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    PRO_QWEN_MODEL: str = os.getenv("PRO_QWEN_MODEL", "qwen-mt-turbo")

    # BytePlus ModelArk — Doubao / Skylark, Singapore datacenter (~50ms latency)
    PRO_BYTEPLUS_API_KEY: str = os.getenv("PRO_BYTEPLUS_API_KEY", "")
    PRO_BYTEPLUS_BASE_URL: str = os.getenv(
        "PRO_BYTEPLUS_BASE_URL", "https://ark.ap-southeast.bytepluses.com/api/v3"
    )
    PRO_BYTEPLUS_MODEL: str = os.getenv("PRO_BYTEPLUS_MODEL", "doubao-pro-32k")

    TRANSLATION_GLOSSARY_PATH: str = os.getenv("TRANSLATION_GLOSSARY_PATH", "")
    TRANSLATION_GLOSSARY_VERSION: str = os.getenv("TRANSLATION_GLOSSARY_VERSION", "1.0.0")

    LAYA_TRANSLATION_CLASSIFICATION_ENABLED: bool = os.getenv("LAYA_TRANSLATION_CLASSIFICATION_ENABLED", "true").lower() in ("true", "1", "yes")
    LAYA_CLASSIFICATION_TIMEOUT_MS: int = int(os.getenv("LAYA_CLASSIFICATION_TIMEOUT_MS", "100"))

    TRANSLATION_DATASET_COLLECTION_ENABLED: bool = os.getenv("TRANSLATION_DATASET_COLLECTION_ENABLED", "false").lower() in ("true", "1", "yes")
    TRANSLATION_DATASET_STORAGE_DIR: str = os.getenv("TRANSLATION_DATASET_STORAGE_DIR", "output/datasets")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Speech Quality & Content Moderation Guardrails
    QUALITY_FILTER_ENABLED: bool = os.getenv("QUALITY_FILTER_ENABLED", "true").lower() in ("true", "1", "yes")
    HALLUCINATION_FILTER_ENABLED: bool = os.getenv("HALLUCINATION_FILTER_ENABLED", "true").lower() in ("true", "1", "yes")
    FILLER_FILTER_ENABLED: bool = os.getenv("FILLER_FILTER_ENABLED", "true").lower() in ("true", "1", "yes")
    MODERATION_ENABLED: bool = os.getenv("MODERATION_ENABLED", "true").lower() in ("true", "1", "yes")
    MODERATION_POLICY_MODE: str = os.getenv("MODERATION_POLICY_MODE", "mask")  # "mask" or "drop"
    WHISPER_NO_SPEECH_THRESHOLD: float = float(os.getenv("WHISPER_NO_SPEECH_THRESHOLD", "0.6"))
    WHISPER_COMPRESSION_RATIO_THRESHOLD: float = float(os.getenv("WHISPER_COMPRESSION_RATIO_THRESHOLD", "2.4"))

    # Performance & Concurrency Optimizations
    WHISPER_VAD_FILTER: bool = os.getenv("WHISPER_VAD_FILTER", "true").lower() in ("true", "1", "yes")
    WHISPER_MAX_BUFFER_SECONDS: float = float(os.getenv("WHISPER_MAX_BUFFER_SECONDS", "7.0"))
    WHISPER_MAX_CONCURRENT_TRANSCRIBES: int = int(os.getenv("WHISPER_MAX_CONCURRENT_TRANSCRIBES", "2"))
    WHISPER_CPU_THREADS: int = int(os.getenv("WHISPER_CPU_THREADS", "4"))
    STT_INTERIM_MIN_DURATION_SECONDS: float = float(os.getenv("STT_INTERIM_MIN_DURATION_SECONDS", "0.8"))
    STT_INTERIM_THROTTLE_SECONDS: float = float(os.getenv("STT_INTERIM_THROTTLE_SECONDS", "0.8"))
    INTERIM_TRANSLATION_MIN_WORDS: int = int(os.getenv("INTERIM_TRANSLATION_MIN_WORDS", "3"))
    VAD_ENERGY_THRESHOLD: float = float(os.getenv("VAD_ENERGY_THRESHOLD", "0.00015"))
    VAD_RMS_THRESHOLD: float = float(os.getenv("VAD_RMS_THRESHOLD", "0.010"))
    WHISPER_MIN_SPEECH_RMS: float = float(os.getenv("WHISPER_MIN_SPEECH_RMS", "0.008"))
    WHISPER_MIN_SPEECH_PEAK: float = float(os.getenv("WHISPER_MIN_SPEECH_PEAK", "0.022"))

    # Polar Payment Integration
    POLAR_ACCESS_TOKEN: str = os.getenv("POLAR_ACCESS_TOKEN", "")
    POLAR_WEBHOOK_SECRET: str = os.getenv("POLAR_WEBHOOK_SECRET", "")
    POLAR_SERVER: str = os.getenv("POLAR_SERVER", "production")

settings = Settings()
