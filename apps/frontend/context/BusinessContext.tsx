import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { businessApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Business, Membership, BusinessRole } from '@/types';

interface BusinessContextValue {
  businesses: Business[];
  memberships: Membership[];
  currentBusiness: Business | null;
  currentRole: BusinessRole | null;
  loading: boolean;
  error: string | null;
  switchBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
  createBusiness: (data: Partial<Business>) => Promise<Business>;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

const STORAGE_KEY = 'businessiq_current_business_id';

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const switchGuard = useRef(false);

  const fetchBusinesses = useCallback(async () => {
    if (!session?.user) {
      setBusinesses([]);
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { businesses: bizList, memberships: memList } = await businessApi.listForUser(session.user.id);
      setBusinesses(bizList);
      setMemberships(memList);

      if (bizList.length === 0) {
        setCurrentBusinessId(null);
        setLoading(false);
        return;
      }

      const bizIds = new Set(bizList.map((b) => b.id));
      let nextId = currentBusinessId && bizIds.has(currentBusinessId) ? currentBusinessId : null;
      if (!nextId) {
        try {
          if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && bizIds.has(stored)) nextId = stored;
          }
        } catch { /* non-web */ }
      }
      if (!nextId) nextId = bizList[0].id;
      setCurrentBusinessId(nextId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, [session?.user, currentBusinessId]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    if (!session) {
      setBusinesses([]);
      setMemberships([]);
      setCurrentBusinessId(null);
    }
  }, [session]);

  const switchBusiness = useCallback((businessId: string) => {
    switchGuard.current = true;
    setCurrentBusinessId(businessId);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, businessId);
      }
    } catch {
      // non-web environment
    }
    setTimeout(() => { switchGuard.current = false; }, 100);
  }, []);

  const createBusiness = useCallback(async (data: Partial<Business>): Promise<Business> => {
    if (!session?.user) throw new Error('Not authenticated');

    const business = await businessApi.create(session.user.id, data);
    await fetchBusinesses();
    setCurrentBusinessId(business.id);
    return business;
  }, [session?.user, fetchBusinesses]);

  const currentBusiness = businesses.find((b) => b.id === currentBusinessId) ?? null;
  const currentRole = memberships.find((m) => m.business_id === currentBusinessId)?.role ?? null;
  const currentMemberships = memberships.filter((m) => m.business_id === currentBusinessId);

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        memberships: currentMemberships,
        currentBusiness,
        currentRole,
        loading,
        error,
        switchBusiness,
        refreshBusinesses: fetchBusinesses,
        createBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
