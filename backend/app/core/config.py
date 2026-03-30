from functools import lru_cache
from pathlib import Path
from typing import List, Tuple, Type

from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    gemini_api_key: str = ""
    groq_api_key: str = ""
    jwt_secret_key: str = "tp-automate-super-secret-jwt-key-2026-change-in-production"
    chroma_persist_dir: str = "./chroma_db"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/auto_agentic"
    model_simple: str = "llama-3.1-8b-instant"
    model_complex: str = "llama-3.3-70b-versatile"
    embedding_model: str = "all-MiniLM-L6-v2"
    max_tokens_simple: int = 700
    max_tokens_complex: int = 1400
    allowed_origins: str = "http://localhost:3000"
    langsmith_api_key: str = ""
    langsmith_tracing: bool = False
    langsmith_project: str = "auto-agentic"

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # .env file takes priority over system/user environment variables
    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        return (init_settings, dotenv_settings, env_settings, file_secret_settings)

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
