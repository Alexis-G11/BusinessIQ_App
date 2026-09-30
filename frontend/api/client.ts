// BusinessIQ API Client
// Centralizes base URL, auth token, and error handling.
// Every domain API file imports from here.
// To switch from mock to real: change USE_MOCKS to false and set EXPO_PUBLIC_API_URL.

import type { AuthSession } from '../lib/types';

const USE_MOCKS = true;

// Will be set from env when real backend is ready
const BASE_URL = '';

let _session: AuthSession | null = null;

export function setSession(session: AuthSession | null) {
  _session = session;
}

export function getSession(): AuthSession | null {
  return _session;
}

export function getAuthToken(): string | null {
  return _session?.token ?? null;
}

export function getOrganizationId(): string | null {
  return _session?.organization.id ?? null;
}

export function getOrganizationCurrency(): string {
  return _session?.organization.currency ?? 'USD';
}

export function isMockMode(): boolean {
  return USE_MOCKS;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Request failed');
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

// Simulates network latency for mock implementations
export function mockDelay(min = 200, max = 600): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simulates occasional errors (5% chance) for testing error states
export function mockMaybeError(errorRate = 0): Promise<void> {
  return new Promise((_, reject) => {
    if (Math.random() < errorRate) {
      reject(new ApiError('Simulated network error', 500));
    } else {
      _;
    }
  });
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
