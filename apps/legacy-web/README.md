# BusinessIQ Web

## Run locally

1. Install Node.js LTS and npm.
2. From this directory, copy `.env.example` to `.env.local`.
3. In `web/.env.local`, set `VITE_API_URL` to the local FastAPI URL and set the Supabase project URL and **anon/public** key. Never put the Supabase service-role key or other server secrets in a `VITE_` variable.
4. Make sure `backend/.env` points to the same Supabase project and that `CORS_ORIGINS` includes `http://localhost:5173` and `http://127.0.0.1:5173` if that setting is present.
5. Start the backend from `backend/` with `python -m uvicorn app.main:app --port 8000`.
6. In a separate terminal, run:

   ```powershell
   npm install
   npm run dev
   ```

7. Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

The sign-up form calls `POST /api/v1/auth/signup`. Depending on the Supabase project's email-confirmation settings, confirm the new address before signing in. The sign-in form authenticates with Supabase, then loads the BusinessIQ workspace from `GET /api/v1/auth/me`.
