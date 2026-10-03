from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    environment: str = "development"  # development | staging | production
    cors_origins: str = "http://localhost:8081,http://localhost:19006"

    # --- Database (Supabase Postgres) ---
    database_url: str  # runtime: postgresql+asyncpg://...
    direct_url: str    # migrations: postgresql://... (or +psycopg2)

    # --- Supabase ---
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str | None = None  # only for projects using the legacy HS256 secret

    # --- Stripe ---
    stripe_secret_key: str
    stripe_platform_webhook_secret: str
    stripe_connect_webhook_secret: str | None = None  # only if you add Stripe Connect

    # --- AI assistant (optional until that feature is built) ---
    anthropic_api_key: str | None = None

    @field_validator("environment")
    @classmethod
    def _check_environment(cls, v: str) -> str:
        v = v.lower()
        if v not in {"development", "staging", "production"}:
            raise ValueError("environment must be development, staging or production")
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()