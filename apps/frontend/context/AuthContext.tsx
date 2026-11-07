import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, profileApi, type AuthSession } from '@/lib/api';
import type { Profile } from '@/types';

interface AuthState {
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  phoneVerificationRequired: boolean;
  authError: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string, businessName: string, phone: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'phone_verified'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    loading: true,
    phoneVerificationRequired: false,
    authError: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const setup = await authApi.completeAccountSetup();
    const profile = await profileApi.get(userId);
    return { profile, phoneVerificationRequired: !setup.ready };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (state.session?.user) {
      const account = await fetchProfile(state.session.user.id);
      setState((s) => ({
        ...s,
        ...account,
        authError: null,
      }));
    }
  }, [state.session?.user, fetchProfile]);

  const applySession = useCallback(async (
    session: AuthSession | null,
    isActive: () => boolean = () => true,
  ) => {
    if (!session?.user) {
      if (isActive()) {
        setState({
          session: null,
          profile: null,
          loading: false,
          phoneVerificationRequired: false,
          authError: null,
        });
      }
      return false;
    }

    try {
      const account = await fetchProfile(session.user.id);
      if (isActive()) {
        setState({
          session,
          ...account,
          loading: false,
          authError: null,
        });
      }
      return account.phoneVerificationRequired;
    } catch (error) {
      if (isActive()) {
        setState({
          session,
          profile: null,
          loading: false,
          phoneVerificationRequired: false,
          authError: error instanceof Error ? error.message : 'Could not load your account.',
        });
      }
      return false;
    }
  }, [fetchProfile]);

  useEffect(() => {
    let active = true;
    void authApi.getSession()
      .then((session) => applySession(session, () => active))
      .catch((error: unknown) => {
        if (active) {
          setState({
            session: null,
            profile: null,
            loading: false,
            phoneVerificationRequired: false,
            authError: error instanceof Error ? error.message : 'Could not restore your session.',
          });
        }
      });

    const sub = authApi.onAuthStateChange((session) => {
      void applySession(session, () => active);
    });

    return () => {
      active = false;
      sub.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    const session = await authApi.signIn(email, password);
    try {
      const account = await fetchProfile(session.user.id);
      setState({
        session,
        ...account,
        loading: false,
        authError: null,
      });
      return account.phoneVerificationRequired;
    } catch (error) {
      setState({
        session,
        profile: null,
        loading: false,
        phoneVerificationRequired: false,
        authError: error instanceof Error ? error.message : 'Could not load your account.',
      });
      throw error;
    }
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, businessName: string, phone: string) => {
    await authApi.signUp(email, password, fullName, businessName, phone);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    await authApi.resendConfirmation(email);
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setState({
      session: null,
      profile: null,
      loading: false,
      phoneVerificationRequired: false,
      authError: null,
    });
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'phone_verified'>>) => {
    if (!state.session?.user) throw new Error('Not authenticated');
    await profileApi.update(state.session.user.id, updates);
    await refreshProfile();
  }, [state.session?.user, refreshProfile]);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, resendConfirmation, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
