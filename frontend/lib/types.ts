// BusinessIQ Domain Types
// These mirror the backend SQLAlchemy/Pydantic models

// --- Auth & Organization ---

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff' | 'accountant';

export type Permission =
  | 'sales.manage'
  | 'money.manage'
  | 'customers.manage'
  | 'reports.view'
  | 'settings.manage'
  | 'users.manage'
  | 'ai.use';

export interface Organization {
  id: string;
  name: string;
  industry: string;
  business_size: 'micro' | 'small' | 'medium';
  country: string;
  currency: string;
  timezone: string;
  logo_url: string | null;
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  trial_ends_at: string | null;
  created_at: string;
}

export interface AuthSession {
  user: User;
  organization: Organization;
  token: string;
}

// --- Products & Inventory ---

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  unit: string;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  product_count: number;
}

// --- Sales ---

export type SaleStatus = 'completed' | 'refunded' | 'pending';

export interface SaleLineItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: string;
  reference: string;
  customer_id: string | null;
  customer_name: string;
  status: SaleStatus;
  line_items: SaleLineItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'credit';
  created_at: string;
}

export interface SalesFilter {
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  status?: SaleStatus;
}

// --- Customers & Suppliers ---

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  outstanding_balance: number;
  total_spent: number;
  total_orders: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  outstanding_balance: number;
  total_purchased: number;
  created_at: string;
}

// --- Money: Expenses, Purchases, Payments ---

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'salaries'
  | 'supplies'
  | 'marketing'
  | 'transport'
  | 'maintenance'
  | 'professional_fees'
  | 'taxes'
  | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receipt_url: string | null;
  created_at: string;
}

export type PurchaseStatus = 'ordered' | 'received' | 'cancelled';

export interface PurchaseLineItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
}

export interface Purchase {
  id: string;
  reference: string;
  supplier_id: string;
  supplier_name: string;
  status: PurchaseStatus;
  line_items: PurchaseLineItem[];
  total: number;
  created_at: string;
}

export type PaymentType = 'received' | 'made';
export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer';

export interface PaymentAllocation {
  id: string;
  invoice_id: string;
  invoice_reference: string;
  amount: number;
}

export interface Payment {
  id: string;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  date: string;
  party_name: string;
  party_id: string;
  reference: string;
  allocations: PaymentAllocation[];
  created_at: string;
}

// --- Accounts Receivable / Payable ---

export interface AgingBucket {
  bucket: 'Current' | '1-30' | '31-60' | '61-90' | '90+';
  amount: number;
  count: number;
}

export interface ReceivableItem {
  id: string;
  customer_name: string;
  invoice_reference: string;
  amount: number;
  due_date: string;
  days_overdue: number;
}

export interface PayableItem {
  id: string;
  supplier_name: string;
  bill_reference: string;
  amount: number;
  due_date: string;
  days_overdue: number;
}

// --- Today / Dashboard ---

export interface TodaySummary {
  revenue: number;
  orders: number;
  new_customers: number;
  successful_payments: number;
  failed_payments: number;
  low_stock_count: number;
}

export type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  message: string;
  action_label: string;
  action_route: string;
  created_at: string;
}

// --- Reports ---

export interface ReportLine {
  label: string;
  amount: number;
  children?: ReportLine[];
  is_total?: boolean;
  is_subtotal?: boolean;
}

export interface IncomeStatement {
  revenue: ReportLine[];
  cost_of_goods: ReportLine[];
  operating_expenses: ReportLine[];
  net_income: number;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  total_operating: number;
}

export interface BalanceSheet {
  assets: ReportLine[];
  liabilities: ReportLine[];
  equity: ReportLine[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

export interface CashFlowStatement {
  operating: ReportLine[];
  investing: ReportLine[];
  financing: ReportLine[];
  net_cash: number;
  opening_balance: number;
  closing_balance: number;
}

export interface TrialBalanceLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  lines: TrialBalanceLine[];
  total_debit: number;
  total_credit: number;
}

export interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  reference: string;
  date: string;
  description: string;
  lines: JournalEntryLine[];
}

// --- AI Assistant ---

export type AIAnswerType = 'fact' | 'calculation' | 'forecast' | 'recommendation';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer_type?: AIAnswerType;
  sources?: string[];
  created_at: string;
}

// --- Billing ---

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

export interface SubscriptionInfo {
  plan_name: string;
  status: Organization['subscription_status'];
  trial_ends_at: string | null;
  days_remaining: number;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  payment_method_last4: string | null;
  next_billing_date: string | null;
}

// --- Help Center ---

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  related_module?: string;
}
