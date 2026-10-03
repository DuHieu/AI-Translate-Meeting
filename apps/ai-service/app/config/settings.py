import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "tiny")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    WHISPER_PRELOAD: bool = os.getenv("WHISPER_PRELOAD", "false").lower() in ("true", "1", "yes")
    WHISPER_INITIAL_PROMPT: str = os.getenv(
        "WHISPER_INITIAL_PROMPT",
        "PR, Git, Docker, Kubernetes, LiveKit, FastAPI, API, bug, sprint, refactor, deploy, microservice, database",
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

    # Context-aware Live Translation settings
    CONTEXTUAL_TRANSLATION_ENABLED: bool = os.getenv("CONTEXTUAL_TRANSLATION_ENABLED", "true").lower() in ("true", "1", "yes")
    TRANSLATION_PROVIDER: str = os.getenv("TRANSLATION_PROVIDER", "contextual")
    TRANSLATION_MODEL: str = os.getenv("TRANSLATION_MODEL", "meeting-v1")
    TRANSLATION_TIMEOUT_MS: int = int(os.getenv("TRANSLATION_TIMEOUT_MS", "1000"))
    TRANSLATION_FALLBACK_PROVIDER: str = os.getenv("TRANSLATION_FALLBACK_PROVIDER", "local")
    TRANSLATION_CONTEXT_MAX_SEGMENTS: int = int(os.getenv("TRANSLATION_CONTEXT_MAX_SEGMENTS", "10"))

    REDIS_URL: str = os.getenv("REDIS_URL", "")
    TRANSLATION_CACHE_ENABLED: bool = os.getenv("TRANSLATION_CACHE_ENABLED", "true").lower() in ("true", "1", "yes")
    TRANSLATION_CACHE_TTL_SECONDS: int = int(os.getenv("TRANSLATION_CACHE_TTL_SECONDS", "86400"))

    TRANSLATION_BACKEND: str = os.getenv("TRANSLATION_BACKEND", "gtx_cloud")
    OFFLINE_TRANSLATION_URL: str = os.getenv(
        "OFFLINE_TRANSLATION_URL", "http://translation-service:5000/translate"
    )

    TRANSLATION_GLOSSARY_PATH: str = os.getenv("TRANSLATION_GLOSSARY_PATH", "")
    TRANSLATION_GLOSSARY_VERSION: str = os.getenv("TRANSLATION_GLOSSARY_VERSION", "1.0.0")

    LAYA_TRANSLATION_CLASSIFICATION_ENABLED: bool = os.getenv("LAYA_TRANSLATION_CLASSIFICATION_ENABLED", "true").lower() in ("true", "1", "yes")
    LAYA_CLASSIFICATION_TIMEOUT_MS: int = int(os.getenv("LAYA_CLASSIFICATION_TIMEOUT_MS", "100"))

    TRANSLATION_DATASET_COLLECTION_ENABLED: bool = os.getenv("TRANSLATION_DATASET_COLLECTION_ENABLED", "false").lower() in ("true", "1", "yes")
    TRANSLATION_DATASET_STORAGE_DIR: str = os.getenv("TRANSLATION_DATASET_STORAGE_DIR", "output/datasets")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()
