// Reports API — mock implementation
// Reports are computed server-side; this mock returns pre-built statements.

import type {
  IncomeStatement, BalanceSheet, CashFlowStatement, TrialBalance, JournalEntry,
} from '../lib/types';
import { mockDelay } from './client';

export async function getIncomeStatement(dateFrom: string, dateTo: string): Promise<IncomeStatement> {
  await mockDelay(500, 1000);
  void dateFrom; void dateTo;
  return {
    revenue: [
      { label: 'Product Sales', amount: 28450.00 },
      { label: 'Service Income', amount: 1200.00 },
    ],
    cost_of_goods: [
      { label: 'Inventory Purchases', amount: 14200.00 },
    ],
    operating_expenses: [
      { label: 'Rent', amount: 2500.00 },
      { label: 'Utilities', amount: 435.50 },
      { label: 'Salaries', amount: 3200.00 },
      { label: 'Marketing', amount: 150.00 },
      { label: 'Transport', amount: 85.00 },
      { label: 'Supplies', amount: 220.00 },
      { label: 'Maintenance', amount: 175.00 },
    ],
    total_revenue: 29650.00,
    total_cogs: 14200.00,
    gross_profit: 15450.00,
    total_operating: 6765.50,
    net_income: 8684.50,
  };
}

export async function getBalanceSheet(dateAsOf: string): Promise<BalanceSheet> {
  await mockDelay(500, 1000);
  void dateAsOf;
  return {
    assets: [
      { label: 'Cash', amount: 15420.00 },
      { label: 'Accounts Receivable', amount: 2025.50 },
      { label: 'Inventory', amount: 8340.00 },
    ],
    liabilities: [
      { label: 'Accounts Payable', amount: 3150.00 },
      { label: 'Sales Tax Payable', amount: 2156.00 },
    ],
    equity: [
      { label: 'Owner Capital', amount: 20000.00 },
      { label: 'Retained Earnings', amount: 847.50 },
    ],
    total_assets: 25785.50,
    total_liabilities: 5306.00,
    total_equity: 20847.50,
  };
}

export async function getCashFlowStatement(dateFrom: string, dateTo: string): Promise<CashFlowStatement> {
  await mockDelay(500, 1000);
  void dateFrom; void dateTo;
  return {
    operating: [
      { label: 'Cash from Sales', amount: 22300.00 },
      { label: 'Cash from Receivables', amount: 300.00 },
      { label: 'Cash paid for Expenses', amount: -6765.50 },
      { label: 'Cash paid to Suppliers', amount: -545.00 },
    ],
    investing: [
      { label: 'Equipment Purchase', amount: -1200.00 },
    ],
    financing: [
      { label: 'Owner Investment', amount: 5000.00 },
    ],
    net_cash: 19089.50,
    opening_balance: 5000.00,
    closing_balance: 24089.50,
  };
}

export async function getTrialBalance(dateAsOf: string): Promise<TrialBalance> {
  await mockDelay(500, 1000);
  void dateAsOf;
  const lines = [
    { account_code: '1000', account_name: 'Cash', debit: 15420.00, credit: 0 },
    { account_code: '1100', account_name: 'Accounts Receivable', debit: 2025.50, credit: 0 },
    { account_code: '1200', account_name: 'Inventory', debit: 8340.00, credit: 0 },
    { account_code: '1500', account_name: 'Equipment', debit: 1200.00, credit: 0 },
    { account_code: '2000', account_name: 'Accounts Payable', debit: 0, credit: 3150.00 },
    { account_code: '2100', account_name: 'Sales Tax Payable', debit: 0, credit: 2156.00 },
    { account_code: '3000', account_name: 'Owner Capital', debit: 0, credit: 20000.00 },
    { account_code: '3100', account_name: 'Retained Earnings', debit: 0, credit: 847.50 },
    { account_code: '4000', account_name: 'Sales Revenue', debit: 0, credit: 29650.00 },
    { account_code: '5000', account_name: 'Cost of Goods Sold', debit: 14200.00, credit: 0 },
    { account_code: '6000', account_name: 'Operating Expenses', debit: 6765.50, credit: 0 },
  ];
  return {
    lines,
    total_debit: lines.reduce((s, l) => s + l.debit, 0),
    total_credit: lines.reduce((s, l) => s + l.credit, 0),
  };
}

export async function getJournalEntries(limit = 20): Promise<JournalEntry[]> {
  await mockDelay(400, 800);
  return [
    {
      id: 'je_1', reference: 'JE-0001', date: new Date(Date.now() - 2 * 86400000).toISOString(),
      description: 'Sale to Green Valley Restaurant',
      lines: [
        { account_code: '1000', account_name: 'Cash', debit: 164.59, credit: 0 },
        { account_code: '4000', account_name: 'Sales Revenue', debit: 0, credit: 152.40 },
        { account_code: '2100', account_name: 'Sales Tax Payable', debit: 0, credit: 12.19 },
      ],
    },
    {
      id: 'je_2', reference: 'JE-0002', date: new Date(Date.now() - 3 * 86400000).toISOString(),
      description: 'Monthly rent payment',
      lines: [
        { account_code: '6000', account_name: 'Operating Expenses', debit: 2500.00, credit: 0 },
        { account_code: '1000', account_name: 'Cash', debit: 0, credit: 2500.00 },
      ],
    },
    {
      id: 'je_3', reference: 'JE-0003', date: new Date(Date.now() - 5 * 86400000).toISOString(),
      description: 'Inventory purchase from Global Foods',
      lines: [
        { account_code: '1200', account_name: 'Inventory', debit: 545.00, credit: 0 },
        { account_code: '1000', account_name: 'Cash', debit: 0, credit: 545.00 },
      ],
    },
  ].slice(0, limit);
}
