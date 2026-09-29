// Auth API — mock implementation
// To switch to real: replace function bodies with `request()` calls to the backend

import type { AuthSession, User, Organization } from '../lib/types';
import { mockDelay, uid, setSession } from './client';
import { mockUser, mockOrganization } from './mock-data';

export interface SignUpInput {
  full_name: string;
  phone: string;
  email: string;
  password: string;
  business_name: string;
  industry: string;
  business_size: 'micro' | 'small' | 'medium';
  country: string;
  currency: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signUp(input: SignUpInput): Promise<{ user: User; organization: Organization }> {
  await mockDelay(600, 1200);
  const user: User = { ...mockUser, id: uid('user'), email: input.email, full_name: input.full_name, phone: input.phone };
  const organization: Organization = {
    ...mockOrganization,
    id: uid('org'),
    name: input.business_name,
    industry: input.industry,
    business_size: input.business_size,
    country: input.country,
    currency: input.currency,
  };
  return { user, organization };
}

export async function signIn(input: SignInInput): Promise<AuthSession> {
  await mockDelay(500, 1000);
  const session: AuthSession = {
    user: { ...mockUser, email: input.email },
    organization: { ...mockOrganization },
    token: uid('token'),
  };
  setSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await mockDelay(100, 300);
  setSession(null);
}

export async function resendConfirmation(email: string): Promise<void> {
  await mockDelay(300, 600);
  void email;
}

export async function confirmEmail(token: string): Promise<{ email: string }> {
  await mockDelay(500, 800);
  void token;
  return { email: mockUser.email };
}
