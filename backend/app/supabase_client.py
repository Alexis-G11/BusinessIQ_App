from supabase import create_client, client
from app.config import settings

supabase_public: Client = create_client(settings.supabase_url, settings.supabase_anon_key)
