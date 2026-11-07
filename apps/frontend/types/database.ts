export type BusinessType = 'sole_proprietor' | 'llc' | 'corporation' | 'partnership' | 'other';

export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'pending_verification' | 'past_due' | 'canceled' | 'expired';

export type BusinessRole = 'owner' | 'admin' | 'manager' | 'accountant' | 'staff' | 'viewer';

export type SaleStatus = 'completed' | 'voided' | 'refunded' | 'pending';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'credit' | 'other';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'void';

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'supplies'
  | 'marketing'
  | 'transport'
  | 'maintenance'
  | 'professional_fees'
  | 'insurance'
  | 'taxes'
  | 'other';

export type ContactType = 'customer' | 'supplier';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  legal_name: string | null;
  industry: string | null;
  business_type: BusinessType | null;
  country: string | null;
  currency: string;
  timezone: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  fiscal_year_start: string | null;
  logo_url: string | null;
  subscription_plan: SubscriptionPlan | null;
  subscription_status: SubscriptionStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  invited_email: string | null;
  status: 'active' | 'invited' | 'removed';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_threshold: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  type: ContactType;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  opening_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  sale_number: string;
  customer_id: string | null;
  contact_name: string | null;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total: number;
  paid_amount: number;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface Expense {
  id: string;
  business_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  expense_date: string;
  supplier_id: string | null;
  recurring: boolean;
  recurring_interval: 'none' | 'weekly' | 'monthly' | 'yearly' | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id: string;
  contact_name: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  status: InvoiceStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: string;
  business_id: string;
  payment_number: string;
  contact_id: string;
  contact_name: string;
  contact_type: ContactType;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  invoice_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  business_id: string;
  purchase_number: string;
  supplier_id: string | null;
  contact_name: string;
  subtotal?: number;
  tax?: number;
  total: number;
  paid_amount: number;
  status: 'received' | 'partial' | 'ordered' | 'voided';
  notes: string | null;
  created_by?: string;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
}
