/**
 * Supabase API service — real backend.
 *
 * All functions use the Supabase client defined in lib/supabase.ts.
 * Function signatures match the old mock API so call sites don't change.
 */

import { supabase } from '@/lib/supabase';
import { backendAuthApi, backendRequest, createIdempotencyKey } from '@/lib/backend';
import type {
  Profile,
  Business,
  Membership,
  BusinessType,
  BusinessRole,
  Product,
  Contact,
  Sale,
  SaleItem,
  Expense,
  Invoice,
  Payment,
  Purchase,
  ExpenseCategory,
  PaymentMethod,
  SaleStatus,
  InvoiceStatus,
  ContactType,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthSession {
  user: { id: string; email: string };
  access_token: string;
}

export function moneyToCents(value: string | number): number {
  const raw = String(value).trim();
  if (!raw) return 0;
  const match = /^(?:(\d+)(?:\.(\d{0,2}))?|\.(\d{1,2}))$/.exec(raw);
  if (!match) throw new Error('Enter an amount with no more than two decimal places.');
  const whole = Number(match[1] ?? '0');
  const fractional = Number((match[2] ?? match[3] ?? '').padEnd(2, '0') || '0');
  const cents = whole * 100 + fractional;
  if (!Number.isSafeInteger(cents)) throw new Error('This amount is too large.');
  return cents;
}

function productFromBackend(row: {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  category_id: string | null;
  cost_price_cents: number;
  selling_price_cents: number;
  stock_quantity: number;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
}, businessId: string): Product {
  return {
    id: row.id,
    business_id: businessId,
    category_id: row.category_id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    description: row.description,
    cost_price: row.cost_price_cents / 100,
    selling_price: row.selling_price_cents / 100,
    stock_quantity: row.stock_quantity,
    reorder_threshold: row.reorder_level,
    unit: row.unit ?? 'piece',
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  async getSession(): Promise<AuthSession | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    return {
      user: { id: data.session.user.id, email: data.session.user.email ?? '' },
      access_token: data.session.access_token,
    };
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return {
      user: { id: data.user.id, email: data.user.email ?? '' },
      access_token: data.session!.access_token,
    };
  },

  async completeAccountSetup(): Promise<{ ready: boolean; phone_number: string | null }> {
    return backendAuthApi.completeSignup();
  },

  async signUp(email: string, password: string, fullName: string, businessName: string, phone: string): Promise<void> {
    await backendAuthApi.signUp({
      email,
      password,
      full_name: fullName,
      business_name: businessName,
      phone_number: phone,
    });
  },

  async sendPhoneVerification(phone: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) throw error;
  },

  async verifyPhoneCode(phone: string, token: string): Promise<void> {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'phone_change',
    });
    if (error) throw error;
  },

  async completePhoneVerification(phone: string): Promise<void> {
    await backendAuthApi.completePhoneVerification(phone);
  },

  async sendPasswordRecoveryCode(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async updatePasswordWithRecoveryCode(email: string, token: string, password: string): Promise<void> {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (verifyError) throw verifyError;

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw updateError;
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        callback({ user: { id: session.user.id, email: session.user.email ?? '' }, access_token: session.access_token });
      } else {
        callback(null);
      }
    });
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },
};

// ---------------------------------------------------------------------------
// Profile API
// ---------------------------------------------------------------------------

export const profileApi = {
  async get(userId: string): Promise<Profile | null> {
    const { user } = await backendAuthApi.me();
    if (user.id !== userId) throw new Error('Authenticated user does not match the requested profile.');
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone_number ?? user.pending_phone_number,
      phone_verified: user.phone_verified,
      created_at: user.created_at,
      updated_at: user.created_at,
    };
  },

  async update(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'phone_verified'>>): Promise<void> {
    const profile = await backendAuthApi.me();
    if (profile.user.id !== userId) throw new Error('Authenticated user does not match the requested profile.');
    if (Object.hasOwn(updates, 'phone_verified')) {
      throw new Error('Phone verification cannot be changed from profile settings.');
    }
    const payload: { full_name?: string; phone_number?: string | null } = {};
    if (Object.hasOwn(updates, 'full_name')) payload.full_name = updates.full_name ?? undefined;
    if (Object.hasOwn(updates, 'phone')) payload.phone_number = updates.phone;
    await backendAuthApi.updateMe(payload);
  },
};

// ---------------------------------------------------------------------------
// Business + Membership API
// ---------------------------------------------------------------------------

export const businessApi = {
  async listForUser(userId: string): Promise<{ businesses: Business[]; memberships: Membership[] }> {
    const response = await backendAuthApi.me();
    if (response.user.id !== userId) throw new Error('Authenticated user does not match the requested businesses.');
    const org = response.organization;
    const status = org.subscription_status === 'trialing' || org.subscription_status === 'active'
      || org.subscription_status === 'pending_verification'
      || org.subscription_status === 'past_due' || org.subscription_status === 'canceled'
      || org.subscription_status === 'expired' ? org.subscription_status : 'expired';
    const business: Business = {
      id: org.id,
      owner_id: response.is_owner ? userId : '',
      name: org.name,
      legal_name: null,
      industry: org.industry,
      business_type: 'other',
      country: org.country,
      currency: org.currency,
      timezone: org.timezone,
      address: null,
      phone: null,
      email: null,
      tax_id: null,
      fiscal_year_start: null,
      logo_url: null,
      subscription_plan: null,
      subscription_status: status,
      trial_ends_at: org.trial_ends_at,
      created_at: org.created_at,
      updated_at: org.created_at,
    };
    const membership: Membership = {
      id: `owner:${org.id}:${userId}`,
      business_id: org.id,
      user_id: userId,
      role: response.is_owner ? 'owner' : 'staff',
      invited_email: null,
      status: 'active',
      created_at: org.created_at,
      updated_at: org.created_at,
    };
    return { businesses: [business], memberships: [membership] };
  },

  async create(_userId: string, _data: Partial<Business>): Promise<Business> {
    throw new Error('Creating additional businesses is not available in the BusinessIQ API yet.');
  },
};

// ---------------------------------------------------------------------------
// Generic table helpers (used by hooks)
// ---------------------------------------------------------------------------

export async function listTable<T extends { business_id: string }>(
  table: 'products' | 'contacts' | 'sales' | 'expenses' | 'invoices' | 'payments' | 'purchases',
  businessId: string,
  opts?: { orderBy?: string; ascending?: boolean; limit?: number; filter?: (row: T) => boolean }
): Promise<T[]> {
  let query = supabase.from(table).select('*').eq('business_id', businessId);

  if (opts?.orderBy) {
    query = query.order(opts.orderBy, { ascending: opts.ascending ?? false });
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as T[];
  if (opts?.filter) rows = rows.filter(opts.filter);
  return rows;
}

// ---------------------------------------------------------------------------
// Products API
// ---------------------------------------------------------------------------

export const productApi = {
  async list(businessId: string): Promise<Product[]> {
    const rows = await backendRequest<Parameters<typeof productFromBackend>[0][]>(
      '/products?active_only=false&limit=200',
      { organizationId: businessId },
    );
    return rows.map((row) => productFromBackend(row, businessId));
  },

  async create(
    businessId: string,
    data: Partial<Product>,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<Product> {
    if (data.stock_quantity) {
      throw new Error('Receive opening stock through a purchase so inventory and accounting stay in sync.');
    }
    const row = await backendRequest<Parameters<typeof productFromBackend>[0]>('/products', {
      method: 'POST',
      organizationId: businessId,
      idempotencyKey,
      body: {
        name: data.name ?? 'Untitled',
        description: data.description ?? null,
        sku: data.sku ?? null,
        barcode: data.barcode ?? null,
        unit: data.unit ?? 'piece',
        category_id: data.category_id ?? null,
        supplier_id: null,
        cost_price_cents: moneyToCents(data.cost_price ?? 0),
        selling_price_cents: moneyToCents(data.selling_price ?? 0),
        reorder_level: data.reorder_threshold ?? 5,
        initial_stock: 0,
      },
    });
    return productFromBackend(row, businessId);
  },

  async createBatch(_businessId: string, _userId: string, _products: Partial<Product>[]): Promise<Product[]> {
    throw new Error('Bulk product import is not available through the BusinessIQ API yet.');
  },
};

export interface InventorySummary {
  active_products: number;
  units_in_stock: number;
  inventory_value_cents: number;
  out_of_stock: number;
  low_stock: number;
  valuation_method: 'weighted_average';
}

export const inventoryApi = {
  summary(businessId: string): Promise<InventorySummary> {
    return backendRequest('/inventory/summary', { organizationId: businessId });
  },
  adjust(
    businessId: string,
    body: {
      product_id: string;
      counted_quantity: number;
      reason: 'count_correction' | 'damaged' | 'expired' | 'lost' | 'found' | 'other';
      note: string | null;
    },
    idempotencyKey: string,
  ): Promise<{
    id: string;
    product_id: string;
    quantity_change: number;
    resulting_quantity: number;
    movement_type: string;
  }> {
    return backendRequest('/inventory/adjustments', {
      method: 'POST',
      organizationId: businessId,
      idempotencyKey,
      body,
    });
  },
};

// ---------------------------------------------------------------------------
// Subscription API
// ---------------------------------------------------------------------------

export const subscriptionApi = {
  async getStatus(businessId: string): Promise<{
    plan: SubscriptionPlan | null;
    status: SubscriptionStatus;
    trial_ends_at: string | null;
    daysRemaining: number;
    isTrialActive: boolean;
    hasAccess: boolean;
  }> {
    const { organization } = await backendAuthApi.me();
    if (organization.id !== businessId) throw new Error('Requested business does not match the active BusinessIQ organization.');

    const status = organization.subscription_status;
    const trialEndsAt = organization.trial_ends_at;
    const trialEndMs = trialEndsAt ? Date.parse(trialEndsAt) : Number.NaN;
    const remainingMs = trialEndMs - Date.now();
    const isTrialActive = status === 'trialing' && remainingMs > 0;

    return {
      plan: null,
      status,
      trial_ends_at: trialEndsAt,
      daysRemaining: isTrialActive ? Math.ceil(remainingMs / 86_400_000) : 0,
      isTrialActive,
      hasAccess: status === 'active' || isTrialActive,
    };
  },

  async pay(businessId: string): Promise<{ success: boolean; plan: SubscriptionPlan; status: SubscriptionStatus }> {
    void businessId;
    throw new Error('Online billing is not available yet. Subscription status can only be changed by the BusinessIQ billing service.');
  },

  async createBatch(businessId: string, _userId: string, products: Partial<Product>[]): Promise<Product[]> {
    return productApi.createBatch(businessId, _userId, products);
  },
};

// ---------------------------------------------------------------------------
// Contact API
// ---------------------------------------------------------------------------

export const contactApi = {
  async list(businessId: string, type?: ContactType): Promise<Contact[]> {
    const [customers, suppliers] = await Promise.all([
      type === 'supplier'
        ? Promise.resolve([])
        : backendRequest<Array<{ id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null; created_at: string }>>(
            '/customers?limit=200',
            { organizationId: businessId },
          ),
      type === 'customer'
        ? Promise.resolve([])
        : backendRequest<Array<{ id: string; name: string; phone: string | null; email: string | null; address: string | null; created_at: string }>>(
            '/suppliers?limit=200',
            { organizationId: businessId },
          ),
    ]);

    return [
      ...customers.map((customer): Contact => ({
        id: customer.id,
        business_id: businessId,
        type: 'customer',
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        opening_balance: 0,
        created_at: customer.created_at,
        updated_at: customer.created_at,
      })),
      ...suppliers.map((supplier): Contact => ({
        id: supplier.id,
        business_id: businessId,
        type: 'supplier',
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        notes: null,
        opening_balance: 0,
        created_at: supplier.created_at,
        updated_at: supplier.created_at,
      })),
    ];
  },

  async create(businessId: string, data: Partial<Contact>): Promise<Contact> {
    const type = data.type ?? 'customer';
    const path = type === 'customer' ? '/customers' : '/suppliers';
    const body = type === 'customer'
      ? {
          name: data.name ?? 'Unknown',
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          notes: data.notes ?? null,
        }
      : {
          name: data.name ?? 'Unknown',
          contact_name: data.name ?? 'Unknown',
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
        };
    const row = await backendRequest<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      notes?: string | null;
      created_at: string;
    }>(path, { method: 'POST', organizationId: businessId, body });
    return {
      id: row.id,
      business_id: businessId,
      type,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      notes: row.notes ?? null,
      opening_balance: 0,
      created_at: row.created_at,
      updated_at: row.created_at,
    };
  },
};

// ---------------------------------------------------------------------------
// Expenses API
// ---------------------------------------------------------------------------

export const expenseApi = {
  async create(businessId: string, userId: string, data: Partial<Expense>): Promise<Expense> {
    const { data: expense, error } = await supabase.from('expenses').insert({
      business_id: businessId,
      category: data.category ?? 'other',
      description: data.description ?? '',
      amount: data.amount ?? 0,
      payment_method: data.payment_method ?? 'cash',
      expense_date: data.expense_date ?? new Date().toISOString().split('T')[0],
      supplier_id: null,
      recurring: false,
      recurring_interval: 'none',
      notes: data.notes ?? null,
      created_by: userId,
    }).select().single();
    if (error) throw error;
    return expense as Expense;
  },
};

// ---------------------------------------------------------------------------
// Sales API
// ---------------------------------------------------------------------------

export const saleApi = {
  async list(businessId: string): Promise<Sale[]> {
    const rows = await backendRequest<Array<{
      id: string;
      reference: string | null;
      sale_date: string;
      status: string;
      customer_id: string | null;
      customer_name: string | null;
      total_cents: number;
      amount_paid_cents: number;
      created_at: string;
    }>>('/sales?limit=200', { organizationId: businessId });
    return rows.map((row) => ({
      id: row.id,
      business_id: businessId,
      sale_number: row.reference ?? row.id,
      customer_id: row.customer_id,
      contact_name: row.customer_name,
      total: row.total_cents / 100,
      paid_amount: row.amount_paid_cents / 100,
      status: row.status as SaleStatus,
      payment_method: null,
      notes: null,
      created_by: '',
      created_at: row.created_at,
      updated_at: row.created_at,
    }));
  },

  quote(
    businessId: string,
    data: { items: { product_id: string; quantity: number }[]; discount_cents: number },
  ): Promise<{
    subtotal_cents: number;
    discount_cents: number;
    tax_cents: number;
    total_cents: number;
  }> {
    return backendRequest('/sales/quote', {
      method: 'POST',
      organizationId: businessId,
      body: data,
    });
  },

  async create(
    businessId: string,
    data: {
      customer_id: string | null;
      discount_cents: number;
      items: { product_id: string; quantity: number }[];
      payments: { method: 'cash' | 'bank' | 'card' | 'mobile_money' | 'other'; amount_cents: number }[];
    },
    notes: string | null = null,
    idempotencyKey = createIdempotencyKey(),
  ): Promise<{ reference: string | null; total_cents: number; tax_cents: number }> {
    return backendRequest('/sales', {
      method: 'POST',
      organizationId: businessId,
      idempotencyKey,
      body: { ...data, notes },
    });
  },
};

// ---------------------------------------------------------------------------
// Invoices API
// ---------------------------------------------------------------------------

export const invoiceApi = {
  async create(businessId: string, userId: string, data: {
    invoice_number: string;
    customer_id: string;
    contact_name: string;
    issue_date: string;
    due_date: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes: string | null;
  }): Promise<Invoice> {
    const { data: invoice, error } = await supabase.from('invoices').insert({
      business_id: businessId,
      invoice_number: data.invoice_number,
      customer_id: data.customer_id,
      contact_name: data.contact_name,
      issue_date: data.issue_date,
      due_date: data.due_date,
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      paid_amount: 0,
      status: 'draft',
      notes: data.notes,
      created_by: userId,
    }).select().single();
    if (error) throw error;
    return invoice as Invoice;
  },

  async updateStatus(invoiceId: string, status: InvoiceStatus): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (status === 'paid') updates.paid_amount = undefined; // will be set by trigger or manually
    const { error } = await supabase.from('invoices').update(updates).eq('id', invoiceId);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// Payments API
// ---------------------------------------------------------------------------

export const paymentApi = {
  async create(businessId: string, userId: string, data: {
    contact_id: string;
    contact_name: string;
    contact_type: ContactType;
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    reference: string | null;
    notes: string | null;
  }): Promise<Payment> {
    const { data: payment, error } = await supabase.from('payments').insert({
      business_id: businessId,
      payment_number: `PMT-${Date.now()}`,
      contact_id: data.contact_id,
      contact_name: data.contact_name,
      contact_type: data.contact_type,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      reference: data.reference,
      invoice_id: null,
      notes: data.notes,
      created_by: userId,
    }).select().single();
    if (error) throw error;
    return payment as Payment;
  },
};

// ---------------------------------------------------------------------------
// Purchases API
// ---------------------------------------------------------------------------

export const purchaseApi = {
  async list(businessId: string): Promise<Purchase[]> {
    const rows = await backendRequest<Array<{
      id: string;
      reference: string;
      supplier_id: string | null;
      supplier_name: string | null;
      purchase_date: string;
      status: string;
      total_cents: number;
      amount_paid_cents: number;
      balance_cents: number;
      created_at: string;
    }>>('/purchases?limit=200', { organizationId: businessId });
    return rows.map((row) => ({
      id: row.id,
      business_id: businessId,
      purchase_number: row.reference,
      supplier_id: row.supplier_id ?? '',
      contact_name: row.supplier_name ?? 'Unassigned supplier',
      total: row.total_cents / 100,
      paid_amount: row.amount_paid_cents / 100,
      status: row.status as Purchase['status'],
      notes: null,
      created_by: '',
      created_at: row.created_at,
    }));
  },

  create(businessId: string, data: {
    supplier_id: string;
    items: { product_id: string; quantity: number; unit_cost_cents: number }[];
    amount_paid_cents: number;
    payment_method: 'cash' | 'bank' | 'card' | 'mobile_money' | 'other' | null;
    note: string | null;
  }, idempotencyKey = createIdempotencyKey()): Promise<{ reference: string; total_cents: number; balance_cents: number }> {
    return backendRequest('/purchases', {
      method: 'POST',
      organizationId: businessId,
      idempotencyKey,
      body: data,
    });
  },
};

// ---------------------------------------------------------------------------
// Team API
// ---------------------------------------------------------------------------

export const teamApi = {
  async invite(businessId: string, email: string, role: BusinessRole, _inviterId: string): Promise<Membership> {
    const { data: mem, error } = await supabase.from('memberships').insert({
      business_id: businessId,
      role,
      invited_email: email,
      status: 'invited',
    }).select().single();
    if (error) throw error;
    return mem as Membership;
  },

  async listForBusiness(businessId: string): Promise<Membership[]> {
    const { data, error } = await supabase.from('memberships').select('*').eq('business_id', businessId);
    if (error) throw error;
    return (data ?? []) as Membership[];
  },

  async updateRole(membershipId: string, role: BusinessRole): Promise<void> {
    const { error } = await supabase.from('memberships').update({ role, updated_at: new Date().toISOString() }).eq('id', membershipId);
    if (error) throw error;
  },

  async remove(membershipId: string): Promise<void> {
    const { error } = await supabase.from('memberships').update({ status: 'removed', updated_at: new Date().toISOString() }).eq('id', membershipId);
    if (error) throw error;
  },
};
