// Billing API — mock implementation

import type { SubscriptionInfo, BillingPlan } from '../lib/types';
import { mockDelay } from './client';
import { mockOrganization } from './mock-data';

export const mockPlans: BillingPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter',
    price: 19,
    currency: 'USD',
    interval: 'month',
    features: ['Up to 500 transactions/mo', '1 user', 'Basic reports', 'Email support'],
  },
  {
    id: 'plan_growth',
    name: 'Growth',
    price: 49,
    currency: 'USD',
    interval: 'month',
    features: ['Unlimited transactions', '5 users', 'All reports', 'AI Assistant', 'Priority support'],
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    price: 99,
    currency: 'USD',
    interval: 'month',
    features: ['Everything in Growth', 'Unlimited users', 'Custom reports', 'API access', 'Dedicated support'],
  },
];

export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  await mockDelay(300, 600);
  const trialEnd = mockOrganization.trial_ends_at ? new Date(mockOrganization.trial_ends_at) : null;
  const daysRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;
  return {
    plan_name: 'Growth',
    status: mockOrganization.subscription_status,
    trial_ends_at: mockOrganization.trial_ends_at,
    days_remaining: daysRemaining,
    amount: 49,
    currency: 'USD',
    interval: 'month',
    payment_method_last4: null,
    next_billing_date: null,
  };
}

export async function startTrial(): Promise<{ checkout_url: string }> {
  await mockDelay(500, 1000);
  return { checkout_url: 'https://checkout.stripe.com/mock-session' };
}

export async function getPlans(): Promise<BillingPlan[]> {
  await mockDelay(200, 400);
  return mockPlans;
}
