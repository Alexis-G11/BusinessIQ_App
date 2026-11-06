from supabase import Client, create_client

from app.config import settings

# Acts as an ordinary visitor: used for sign-up.
supabase_public: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Acts with full authority (service role key). Server-side only: use it for admin
# tasks such as deleting a half-created login. Never expose this client or its key.
supabase_admin: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)