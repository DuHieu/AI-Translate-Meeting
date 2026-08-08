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

    class Config:
        env_file = ".env"

settings = Settings()
