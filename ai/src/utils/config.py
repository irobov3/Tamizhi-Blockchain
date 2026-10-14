"""
Centralized settings using pydantic-settings.
Values are loaded from environment variables and .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    port: int = 8000
    host: str = "0.0.0.0"

    # AI Providers
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Model defaults
    default_model: str = "claude-3-5-sonnet-20241022"
    max_tokens: int = 4096
    default_temperature: float = 0.7

    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_db: int = 1
    conversation_cache_ttl: int = 3600

    # Auth
    jwt_secret: str = "change-me-in-production"

    # Backend
    backend_url: str = "http://localhost:3000"
    tamizhi_lcd_url: str = "https://lcd.tamizhi.network"

    # RAG settings
    literature_context_max_works: int = 5
    literature_context_max_passage_len: int = 500

    # Rate limiting
    max_requests_per_minute: int = 30

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"


settings = Settings()
