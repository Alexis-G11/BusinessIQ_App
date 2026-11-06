import { createClient } from '@supabase/supabase-js';

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!apiBase || !supabaseUrl || !supabaseAnonKey) {
  throw new Error('Set VITE_API_URL, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to run BusinessIQ Web.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface BusinessProfile {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  subscription_status: string;
}

export interface CurrentUser {
  id: string;
  full_name: string;
  email: string;
}

export interface MeResponse {
  user: CurrentUser;
  organization: BusinessProfile;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string; organizationId?: string } = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (options.organizationId) headers['X-Organization-Id'] = options.organizationId;

  const response = await fetch(`${apiBase}/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null && 'detail' in payload
      ? String(payload.detail)
      : `Request failed (${response.status})`;
    throw new ApiError(detail, response.status);
  }
  return payload as T;
}
