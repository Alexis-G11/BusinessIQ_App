// Money API — expenses, purchases, payments, AR/AP

import type {
  Expense, ExpenseCategory, Purchase, Payment, PaymentType, PaymentMethod,
  ReceivableItem, PayableItem, AgingBucket,
} from '../lib/types';
import { mockDelay, uid } from './client';
import { mockExpenses, mockPurchases, mockPayments, mockReceivables, mockPayables } from './mock-data';

let expenses: Expense[] = [...mockExpenses];
let purchases: Purchase[] = [...mockPurchases];
let payments: Payment[] = [...mockPayments];

// --- Expenses ---

export async function getExpenses(): Promise<Expense[]> {
  await mockDelay(300, 600);
  return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  await mockDelay(400, 800);
  const expense: Expense = {
    id: uid('exp'),
    category: input.category,
    amount: input.amount,
    date: input.date,
    description: input.description,
    receipt_url: null,
    created_at: new Date().toISOString(),
  };
  expenses = [expense, ...expenses];
  return expense;
}

export async function getExpenseSummary(): Promise<{ category: ExpenseCategory; total: number; count: number }[]> {
  await mockDelay(300, 600);
  const map = new Map<ExpenseCategory, { total: number; count: number }>();
  expenses.forEach((e) => {
    const existing = map.get(e.category) ?? { total: 0, count: 0 };
    map.set(e.category, { total: existing.total + e.amount, count: existing.count + 1 });
  });
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total);
}

// --- Purchases ---

export async function getPurchases(): Promise<Purchase[]> {
  await mockDelay(300, 600);
  return [...purchases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getPurchase(id: string): Promise<Purchase | null> {
  await mockDelay(200, 400);
  return purchases.find((p) => p.id === id) ?? null;
}

// --- Payments ---

export async function getPayments(): Promise<Payment[]> {
  await mockDelay(300, 600);
  return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface CreatePaymentInput {
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  date: string;
  party_id: string;
  party_name: string;
  allocations: { invoice_id: string; invoice_reference: string; amount: number }[];
}

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  await mockDelay(400, 800);
  const payment: Payment = {
    id: uid('pay'),
    type: input.type,
    amount: input.amount,
    method: input.method,
    date: input.date,
    party_name: input.party_name,
    party_id: input.party_id,
    reference: `PAY-${3000 + payments.length + 1}`,
    allocations: input.allocations.map((a) => ({ ...a, id: uid('alloc') })),
    created_at: new Date().toISOString(),
  };
  payments = [payment, ...payments];
  return payment;
}

// --- Accounts Receivable / Payable ---

export async function getReceivables(): Promise<ReceivableItem[]> {
  await mockDelay(300, 600);
  return [...mockReceivables].sort((a, b) => b.days_overdue - a.days_overdue);
}

export async function getPayables(): Promise<PayableItem[]> {
  await mockDelay(300, 600);
  return [...mockPayables].sort((a, b) => b.days_overdue - a.days_overdue);
}

export async function getReceivableAging(): Promise<AgingBucket[]> {
  await mockDelay(300, 600);
  const buckets: AgingBucket['bucket'][] = ['Current', '1-30', '31-60', '61-90', '90+'];
  return buckets.map((bucket) => {
    const items = mockReceivables.filter((r) => {
      const d = r.days_overdue;
      if (bucket === 'Current') return d === 0;
      if (bucket === '1-30') return d >= 1 && d <= 30;
      if (bucket === '31-60') return d >= 31 && d <= 60;
      if (bucket === '61-90') return d >= 61 && d <= 90;
      return d > 90;
    });
    return { bucket, amount: items.reduce((s, i) => s + i.amount, 0), count: items.length };
  });
}

export async function getPayableAging(): Promise<AgingBucket[]> {
  await mockDelay(300, 600);
  const buckets: AgingBucket['bucket'][] = ['Current', '1-30', '31-60', '61-90', '90+'];
  return buckets.map((bucket) => {
    const items = mockPayables.filter((r) => {
      const d = r.days_overdue;
      if (bucket === 'Current') return d === 0;
      if (bucket === '1-30') return d >= 1 && d <= 30;
      if (bucket === '31-60') return d >= 31 && d <= 60;
      if (bucket === '61-90') return d >= 61 && d <= 90;
      return d > 90;
    });
    return { bucket, amount: items.reduce((s, i) => s + i.amount, 0), count: items.length };
  });
}
