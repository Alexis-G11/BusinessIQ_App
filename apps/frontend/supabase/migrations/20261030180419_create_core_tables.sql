/*
# BusinessIQ — Profiles, Businesses, Memberships

1. New Tables
- `profiles` — extends auth.users with full_name, phone
- `businesses` — company/workspace with owner, currency, subscription
- `memberships` — user<->business many-to-many with role

2. Security
- RLS on all tables, scoped to authenticated role
- profiles: users can CRUD only their own row (id = auth.uid())
- businesses: members can SELECT; only owner can INSERT/UPDATE/DELETE
- memberships: members can SELECT; only owner can INSERT/UPDATE/DELETE
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  phone_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- BUSINESSES
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  industry text,
  business_type text DEFAULT 'sole_proprietor',
  country text,
  currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'UTC',
  address text,
  phone text,
  email text,
  tax_id text,
  fiscal_year_start text,
  logo_url text,
  subscription_plan text NOT NULL DEFAULT 'trial',
  subscription_status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON businesses TO authenticated;

DROP POLICY IF EXISTS "businesses_select_member" ON businesses;
CREATE POLICY "businesses_select_member" ON businesses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = businesses.id AND m.user_id = auth.uid() AND m.status = 'active')
);

DROP POLICY IF EXISTS "businesses_insert_owner" ON businesses;
CREATE POLICY "businesses_insert_owner" ON businesses FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "businesses_update_owner" ON businesses;
CREATE POLICY "businesses_update_owner" ON businesses FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = businesses.id AND m.user_id = auth.uid() AND m.role = 'owner' AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = businesses.id AND m.user_id = auth.uid() AND m.role = 'owner' AND m.status = 'active')
);

DROP POLICY IF EXISTS "businesses_delete_owner" ON businesses;
CREATE POLICY "businesses_delete_owner" ON businesses FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = businesses.id AND m.user_id = auth.uid() AND m.role = 'owner' AND m.status = 'active')
);

-- MEMBERSHIPS
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff',
  invited_email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO authenticated;

DROP POLICY IF EXISTS "memberships_select_member" ON memberships;
CREATE POLICY "memberships_select_member" ON memberships FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m2 WHERE m2.business_id = memberships.business_id AND m2.user_id = auth.uid() AND m2.status = 'active')
);

DROP POLICY IF EXISTS "memberships_insert_owner" ON memberships;
CREATE POLICY "memberships_insert_owner" ON memberships FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m2 WHERE m2.business_id = memberships.business_id AND m2.user_id = auth.uid() AND m2.role = 'owner' AND m2.status = 'active')
);

DROP POLICY IF EXISTS "memberships_update_owner" ON memberships;
CREATE POLICY "memberships_update_owner" ON memberships FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m2 WHERE m2.business_id = memberships.business_id AND m2.user_id = auth.uid() AND m2.role = 'owner' AND m2.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m2 WHERE m2.business_id = memberships.business_id AND m2.user_id = auth.uid() AND m2.role = 'owner' AND m2.status = 'active')
);

DROP POLICY IF EXISTS "memberships_delete_owner" ON memberships;
CREATE POLICY "memberships_delete_owner" ON memberships FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m2 WHERE m2.business_id = memberships.business_id AND m2.user_id = auth.uid() AND m2.role = 'owner' AND m2.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_business ON memberships(user_id, business_id, status);
