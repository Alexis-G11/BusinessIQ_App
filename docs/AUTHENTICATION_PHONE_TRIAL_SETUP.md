# Authentication, Phone Verification, and Trial Setup

## Local email confirmation

The backend sends signup and resend links to:

```text
http://localhost:8081/auth/callback
```

This is the default `AUTH_EMAIL_REDIRECT_URL`. Set that non-secret setting in the backend environment when the frontend URL changes. In Supabase Dashboard, add the exact callback URL to **Authentication → URL Configuration → Redirect URLs**. Add the deployed HTTPS callback URL there before production use. A confirmation email sent before this setting was applied still contains its old destination and may have expired; request a fresh email.

The callback exchanges the confirmation link through the Supabase client, then routes a confirmed user to phone verification. Keep the Supabase confirmation email template's confirmation URL intact.

## SMS phone verification

Enable phone authentication and configure an SMS provider in **Authentication → Providers → Phone** in the Supabase project. Provider credentials belong only in Supabase's provider settings, never in the frontend or source control. The app cannot deliver SMS until a provider is configured and enabled.

After confirming email and signing in, enter a phone number in international E.164 format, such as `+15551234567`. BusinessIQ requests a Supabase phone-change OTP, verifies it with Supabase, and then checks the confirmed phone through the Supabase Admin API before recording the verification. The UI expects a six-digit OTP.

## Database rollout

Apply the backend Alembic migration `d7148ce903af` to the configured Supabase database. It adds phone verification state, a durable unique phone-to-trial claim, and restrictive RLS policies for the existing `organization_id` tables, while preserving existing business and ledger records. The API's database role bypasses RLS; direct Supabase client requests do not.

New trials remain pending until email and phone verification are complete. A seven-day trial begins at phone verification. A trial that already started is not reset, and phone numbers already stored on existing accounts are reserved as prior claims. Existing users with no verified phone must complete phone verification before accessing business features.
