import { supabase } from '@/lib/supabase';
import type { SubscriptionStatus } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

if (!API_URL) {
  throw new Error('Set EXPO_PUBLIC_API_URL before starting the app.');
}

export interface BackendMe {
  is_owner: boolean;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string | null;
    pending_phone_number: string | null;
    phone_verified: boolean;
    created_at: string;
  };
  organization: {
    id: string;
    name: string;
    industry: string | null;
    business_size: string | null;
    country: string | null;
    currency: string;
    currency_exponent: number;
    timezone: string;
    subscription_status: SubscriptionStatus;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface BackendOrganizationMembership {
  organization: BackendMe['organization'] & {
    legal_name: string | null;
    business_type: string | null;
    address: Record<string, unknown> | null;
    phone: string | null;
    email: string | null;
    tax_identifier: string | null;
    fiscal_year_start: string | null;
  };
  membership_id: string;
  user_id: string;
  is_owner: boolean;
  role: string | null;
}

export interface SignUpPayload {
  full_name: string;
  phone_number: string;
  email: string;
  password: string;
  business_name: string;
  country: string;
  currency: string;
  timezone: string;
}

export class BackendError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'BackendError';
  }
}

export async function backendRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    organizationId?: string;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  if (options.organizationId) headers['X-Organization-Id'] = options.organizationId;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new BackendError('Cannot reach the BusinessIQ API. Check the API URL and that the backend is running.', 0);
  }

  const text = await response.text();
  let result: unknown;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }
  if (!response.ok) {
    const detail = typeof result === 'object' && result !== null && 'detail' in result
      ? String(result.detail)
      : `BusinessIQ API request failed (${response.status}).`;
    throw new BackendError(detail, response.status);
  }
  return result as T;
}

export function createIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export const backendAuthApi = {
  signUp(payload: SignUpPayload): Promise<{ message: string }> {
    return backendRequest('/auth/signup', { method: 'POST', body: payload });
  },
  resendConfirmation(email: string): Promise<{ message: string }> {
    return backendRequest('/auth/resend-confirmation', { method: 'POST', body: { email } });
  },
  completeSignup(): Promise<{ ready: boolean; phone_number: string | null }> {
    return backendRequest('/auth/complete-signup', { method: 'POST' });
  },
  completePhoneVerification(phone_number: string): Promise<{ ready: boolean }> {
    return backendRequest('/auth/phone-verification/complete', {
      method: 'POST',
      body: { phone_number },
    });
  },
  meForOrganization(organizationId: string): Promise<BackendMe> {
    return backendRequest('/auth/me', { organizationId });
  },
  profile(): Promise<BackendMe['user']> {
    return backendRequest('/auth/profile');
  },
  updateProfile(payload: { full_name?: string }): Promise<BackendMe['user']> {
    return backendRequest('/auth/profile', { method: 'PATCH', body: payload });
  },
};

export interface BackendOrganizationCreate {
  name: string;
  legal_name?: string | null;
  business_type?: string | null;
  industry?: string | null;
  business_size?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  tax_identifier?: string | null;
  fiscal_year_start?: string | null;
}

export const backendOrganizationApi = {
  list(): Promise<BackendOrganizationMembership[]> {
    return backendRequest('/organizations');
  },
  create(payload: BackendOrganizationCreate): Promise<BackendOrganizationMembership> {
    return backendRequest('/organizations', { method: 'POST', body: payload });
  },
};

export interface BackendIncomeStatement {
  organization_id: string;
  period_start: string;
  period_end: string;
  currency: string;
  currency_basis: 'business_currency';
  accounting_basis: 'accrual';
  source: 'posted_journal_entries';
  lines: { account_code: string; account_name: string; account_type: string; amount: string }[];
  revenue: string;
  cost_of_goods_sold: string;
  gross_profit: string;
  operating_expenses: string;
  operating_income: string;
  other_income: string;
  other_expenses: string;
  net_income: string;
}

export interface BackendBalanceSheet {
  organization_id: string;
  as_of: string;
  currency: string;
  currency_basis: 'business_currency';
  accounting_basis: 'accrual';
  source: 'posted_journal_entries';
  has_activity: boolean;
  assets: BackendIncomeStatement['lines'];
  liabilities: BackendIncomeStatement['lines'];
  equity_accounts: BackendIncomeStatement['lines'];
  current_earnings: string;
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  liabilities_and_equity: string;
  difference: string;
  is_balanced: boolean;
}

export const backendReportsApi = {
  incomeStatement(organizationId: string, fromDate: string, toDate: string): Promise<BackendIncomeStatement> {
    const query = new URLSearchParams({ from: fromDate, to: toDate });
    return backendRequest(`/reports/income-statement?${query.toString()}`, { organizationId });
  },
  balanceSheet(organizationId: string, asOf: string): Promise<BackendBalanceSheet> {
    const query = new URLSearchParams({ as_of: asOf });
    return backendRequest(`/reports/balance-sheet?${query.toString()}`, { organizationId });
  },
};

export type AssignableBusinessRole = 'manager' | 'accountant' | 'employee' | 'inventory_staff' | 'analyst';

export interface BackendInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface BackendMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_owner: boolean;
  role: string | null;
  joined_at: string;
}

export const backendMembershipApi = {
  listMembers(organizationId: string): Promise<BackendMember[]> {
    return backendRequest('/memberships/members', { organizationId });
  },
  updateMemberRole(organizationId: string, membershipId: string, role: AssignableBusinessRole): Promise<BackendMember> {
    return backendRequest(`/memberships/members/${encodeURIComponent(membershipId)}`, {
      method: 'PATCH', organizationId, body: { role },
    });
  },
  removeMember(organizationId: string, membershipId: string): Promise<void> {
    return backendRequest(`/memberships/members/${encodeURIComponent(membershipId)}`, {
      method: 'DELETE', organizationId,
    });
  },
  createInvitation(organizationId: string, email: string, role: AssignableBusinessRole): Promise<{
    id: string;
    email: string;
    role: AssignableBusinessRole;
    token: string;
    expires_at: string;
  }> {
    return backendRequest('/memberships/invitations', {
      method: 'POST',
      organizationId,
      body: { email, role },
    });
  },
  listInvitations(organizationId: string): Promise<BackendInvitation[]> {
    return backendRequest('/memberships/invitations', { organizationId });
  },
  revokeInvitation(organizationId: string, invitationId: string): Promise<void> {
    return backendRequest(`/memberships/invitations/${encodeURIComponent(invitationId)}`, {
      method: 'DELETE',
      organizationId,
    });
  },
  acceptInvitation(token: string): Promise<{
    organization_id: string;
    organization_name: string;
    membership_id: string;
    role: AssignableBusinessRole;
  }> {
    return backendRequest('/memberships/invitations/accept', {
      method: 'POST',
      body: { token },
    });
  },
};
