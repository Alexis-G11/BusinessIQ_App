import { useCallback, useEffect, useState } from 'react';
import { contactApi, expenseApi, inventoryApi, listTable, productApi, purchaseApi, saleApi } from '@/lib/api';
import { useBusiness } from '@/context/BusinessContext';
import type { Sale, Expense, Product, Contact, Invoice, Payment, Purchase } from '@/types';
import type { InventorySummary } from '@/lib/api';

function useBackendBusinessData<T>(load: (businessId: string) => Promise<T[]>) {
  const { currentBusiness } = useBusiness();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!currentBusiness) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await load(currentBusiness.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load business data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness, load]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useBusinessData<T extends { business_id: string }>(
  table: 'products' | 'contacts' | 'sales' | 'expenses' | 'invoices' | 'payments' | 'purchases',
  orderBy?: string,
  ascending: boolean = false,
  limit?: number
) {
  const { currentBusiness } = useBusiness();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!currentBusiness) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listTable<T>(table, currentBusiness.id, { orderBy, ascending, limit });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness, table, orderBy, ascending, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data: data as T[], loading, error, refetch: fetch };
}

export function useSales() {
  return useBackendBusinessData<Sale>(saleApi.list);
}

export function useExpenses() {
  return useBackendBusinessData<Expense>(expenseApi.list);
}

export function useProducts() {
  return useBackendBusinessData<Product>(productApi.list);
}

export function useContacts(type?: 'customer' | 'supplier') {
  const load = useCallback((businessId: string) => contactApi.list(businessId, type), [type]);
  return useBackendBusinessData<Contact>(load);
}

export function useInvoices() {
  return useBusinessData<Invoice>('invoices', 'created_at', false, 100);
}

export function usePayments() {
  return useBusinessData<Payment>('payments', 'created_at', false, 100);
}

export function usePurchases() {
  return useBackendBusinessData<Purchase>(purchaseApi.list);
}

export function useInventorySummary() {
  const { currentBusiness } = useBusiness();
  const [data, setData] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!currentBusiness) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await inventoryApi.summary(currentBusiness.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory summary');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export interface DashboardStats {
  revenue: number;
  expenses: number;
  profit: number;
  salesCount: number;
  productsCount: number;
  lowStockCount: number;
  customersCount: number;
  receivables: number;
  payables: number;
  todaySales: number;
  todayExpenses: number;
  monthRevenue: number;
  monthExpenses: number;
  topProducts: { name: string; revenue: number; qty: number }[];
  salesByDay: { label: string; value: number }[];
  expenseByCategory: { label: string; value: number; color: string }[];
}

export function useDashboardStats(): { stats: DashboardStats | null; loading: boolean; error: string | null } {
  const { currentBusiness } = useBusiness();
  const { data: sales, loading: salesLoading } = useSales();
  const { data: expenses, loading: expensesLoading } = useExpenses();
  const { data: products, loading: productsLoading } = useProducts();
  const { data: invoices, loading: invoicesLoading } = useInvoices();
  const { data: purchases, loading: purchasesLoading } = usePurchases();
  const contacts = useContacts();

  const loading = salesLoading || expensesLoading || productsLoading || invoicesLoading || purchasesLoading || contacts.loading;

  if (loading || !currentBusiness) {
    return { stats: null, loading, error: null };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const completedSales = sales.filter((s) => s.status === 'completed');
  const revenue = completedSales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const todaySales = completedSales
    .filter((s) => s.created_at.startsWith(todayStr))
    .reduce((sum, s) => sum + Number(s.total), 0);
  const todayExpenses = expenses
    .filter((e) => e.expense_date === todayStr)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const monthSales = completedSales
    .filter((s) => s.created_at >= monthStart)
    .reduce((sum, s) => sum + Number(s.total), 0);
  const monthExpenses = expenses
    .filter((e) => new Date(e.expense_date).toISOString() >= monthStart)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const lowStockProducts = products.filter(
    (p) => p.is_active && Number(p.stock_quantity) <= Number(p.reorder_threshold)
  );

  const customers = contacts.data.filter((c) => c.type === 'customer');

  const receivables = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'void')
    .reduce((sum, i) => sum + (Number(i.total) - Number(i.paid_amount)), 0);

  const payables = purchases
    .filter((p) => p.status !== 'voided')
    .reduce((sum, p) => sum + (Number(p.total) - Number(p.paid_amount)), 0);

  const last7Days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const dayRevenue = completedSales
      .filter((s) => s.created_at.startsWith(dayStr))
      .reduce((sum, s) => sum + Number(s.total), 0);
    last7Days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      value: dayRevenue,
    });
  }

  const categoryColors: Record<string, string> = {
    rent: '#2563EB',
    utilities: '#3283CF',
    salaries: '#16865B',
    supplies: '#D99123',
    marketing: '#7C5CFC',
    transport: '#1B9E8E',
    maintenance: '#D94B50',
    other: '#687589',
  };
  const expenseMap: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseMap[e.category] = (expenseMap[e.category] ?? 0) + Number(e.amount);
  });
  const expenseByCategory = Object.entries(expenseMap)
    .map(([label, value]) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
      color: categoryColors[label] ?? '#687589',
    }))
    .sort((a, b) => b.value - a.value);

  return {
    stats: {
      revenue,
      expenses: totalExpenses,
      profit: revenue - totalExpenses,
      salesCount: completedSales.length,
      productsCount: products.length,
      lowStockCount: lowStockProducts.length,
      customersCount: customers.length,
      receivables,
      payables,
      todaySales,
      todayExpenses,
      monthRevenue: monthSales,
      monthExpenses,
      topProducts: [],
      salesByDay: last7Days,
      expenseByCategory,
    } as DashboardStats,
    loading: false,
    error: null,
  };
}
