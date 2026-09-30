// Auth Context — app-wide session state
// Read by the trial-gate logic and every screen that needs organization_id/currency

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User, Organization } from '../lib/types';
import * as authApi from '../api/auth';
import { setSession } from '../api/client';

interface AuthContextValue {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  hasPaymentMethod: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: authApi.SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  setSessionData: (user: User, org: Organization) => void;
  setPaymentCompleted: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const trialDaysRemaining = organization?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(organization.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  const isTrialActive = organization?.subscription_status === 'trialing' && trialDaysRemaining > 0;

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await authApi.signIn({ email, password });
    setUser(session.user);
    setOrganization(session.organization);
    setSession(session);
  }, []);

  const signUp = useCallback(async (input: authApi.SignUpInput) => {
    const { user: newUser, organization: newOrg } = await authApi.signUp(input);
    setUser(newUser);
    setOrganization(newOrg);
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
    setOrganization(null);
    setPaymentCompleted(false);
  }, []);

  const setSessionData = useCallback((u: User, org: Organization) => {
    setUser(u);
    setOrganization(org);
  }, []);

  const handlePaymentCompleted = useCallback(() => {
    setPaymentCompleted(true);
    if (organization) {
      setOrganization({ ...organization, subscription_status: 'active' });
    }
  }, [organization]);

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: !!user,
        isTrialActive,
        trialDaysRemaining,
        hasPaymentMethod: paymentCompleted,
        signIn,
        signUp,
        signOut,
        setSessionData,
        setPaymentCompleted: handlePaymentCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
