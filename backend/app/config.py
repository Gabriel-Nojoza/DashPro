from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


BACKEND_DIR = Path(__file__).resolve().parent.parent
LOCAL_SQLITE_URL = f"sqlite+aiosqlite:///{BACKEND_DIR.joinpath('dashpro-local.db').as_posix()}"


def _is_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    return not normalized or "[your_" in normalized or "change-this" in normalized


class Settings(BaseSettings):
    APP_NAME: str = "DashPro Business"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = LOCAL_SQLITE_URL

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    SECRET_KEY: str = "dashpro-dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    EVOLUTION_API_URL: str = ""
    EVOLUTION_API_KEY: str = ""
    PDF_BAILEYS_BOT_URL: str = "http://localhost:3210"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        if isinstance(value, str):
            if _is_placeholder(value):
                return LOCAL_SQLITE_URL
            if value.startswith("postgresql+asyncpg://"):
                return value
            if value.startswith("postgresql://"):
                return "postgresql+asyncpg://" + value[len("postgresql://"):]
            if value.startswith("postgres://"):
                return "postgresql+asyncpg://" + value[len("postgres://"):]
        return value

    @field_validator("SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_SERVICE_KEY", mode="before")
    @classmethod
    def normalize_optional_secrets(cls, value):
        if isinstance(value, str) and _is_placeholder(value):
            return ""
        return value

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug", "development", "dev"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return value

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
