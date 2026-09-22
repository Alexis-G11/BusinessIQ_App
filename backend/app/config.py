from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    direct_url: str
    supabase_url: str
    supabase_annon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    stripe_secret_key: str
    stripe_platform_webhook_secret: str
    stripe_connect_webhook_secret: str
    anthropic_api_key: str

    class Config:
        env_file = ".env"

settings = Settings()