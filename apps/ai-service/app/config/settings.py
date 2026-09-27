import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    REDIS_HOST: str = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "small")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    DEFAULT_SOURCE_LANGUAGE: str = os.getenv("DEFAULT_SOURCE_LANGUAGE", "vi")
    DEFAULT_TARGET_LANGUAGE: str = os.getenv("DEFAULT_TARGET_LANGUAGE", "ja")
    LAYA_SERVICE_URL: str = os.getenv("LAYA_SERVICE_URL", "http://laya:8000")
    LAYA_CONFIDENCE_THRESHOLD: float = float(os.getenv("LAYA_CONFIDENCE_THRESHOLD", "0.80"))
    LAYA_ENABLED: bool = os.getenv("LAYA_ENABLED", "true").lower() in ("true", "1", "yes")

    class Config:
        env_file = ".env"

settings = Settings()
