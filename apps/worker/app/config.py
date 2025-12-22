"""Application configuration using Pydantic settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/hg_ppc"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Application
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    # Worker
    worker_concurrency: int = 5

    # Encryption (for Phase 1 - decrypting OAuth tokens)
    encryption_key: str = ""


settings = Settings()
