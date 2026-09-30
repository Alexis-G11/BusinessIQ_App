// Mock seed data for BusinessIQ
// Used by all api/*.ts mock implementations

import type {
  User,
  Organization,
  Product,
  Sale,
  Customer,
  Supplier,
  Expense,
  Purchase,
  Payment,
  AttentionItem,
  TodaySummary,
  ReceivableItem,
  PayableItem,
  HelpArticle,
  AIMessage,
} from '../lib/types';

export const mockOrganization: Organization = {
  id: 'org_demo',
  name: 'Sunrise Supermarket',
  industry: 'retail',
  business_size: 'small',
  country: 'United States',
  currency: 'USD',
  timezone: 'America/New_York',
  logo_url: null,
  subscription_status: 'trialing',
  trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockUser: User = {
  id: 'user_demo',
  email: 'owner@sunrisemarket.com',
  full_name: 'Amara Johnson',
  phone: '+1 555-0100',
  role: 'owner',
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockProducts: Product[] = [
  { id: 'prod_1', name: 'Rice 5kg Bag', sku: 'RICE-5KG', category: 'Groceries', price: 12.99, cost: 8.50, unit: 'bag', stock_quantity: 45, low_stock_threshold: 20, created_at: '2025-01-15T10:00:00Z' },
  { id: 'prod_2', name: 'Cooking Oil 1L', sku: 'OIL-1L', category: 'Groceries', price: 4.50, cost: 2.80, unit: 'bottle', stock_quantity: 8, low_stock_threshold: 15, created_at: '2025-01-15T10:05:00Z' },
  { id: 'prod_3', name: 'Sugar 1kg', sku: 'SUG-1KG', category: 'Groceries', price: 2.25, cost: 1.20, unit: 'pack', stock_quantity: 120, low_stock_threshold: 30, created_at: '2025-01-15T10:10:00Z' },
  { id: 'prod_4', name: 'Bottled Water 12pk', sku: 'WTR-12PK', category: 'Beverages', price: 6.99, cost: 3.50, unit: 'pack', stock_quantity: 3, low_stock_threshold: 10, created_at: '2025-01-15T10:15:00Z' },
  { id: 'prod_5', name: 'Detergent 2kg', sku: 'DET-2KG', category: 'Household', price: 8.75, cost: 5.00, unit: 'box', stock_quantity: 32, low_stock_threshold: 12, created_at: '2025-01-15T10:20:00Z' },
  { id: 'prod_6', name: 'Tea Bags 100ct', sku: 'TEA-100', category: 'Beverages', price: 5.49, cost: 2.75, unit: 'box', stock_quantity: 0, low_stock_threshold: 10, created_at: '2025-01-15T10:25:00Z' },
  { id: 'prod_7', name: 'Canned Beans', sku: 'BN-400G', category: 'Canned Goods', price: 1.75, cost: 0.80, unit: 'can', stock_quantity: 85, low_stock_threshold: 25, created_at: '2025-01-15T10:30:00Z' },
  { id: 'prod_8', name: 'Bread Loaf', sku: 'BRD-1', category: 'Bakery', price: 3.25, cost: 1.50, unit: 'loaf', stock_quantity: 18, low_stock_threshold: 8, created_at: '2025-01-15T10:35:00Z' },
];

export const mockCustomers: Customer[] = [
  { id: 'cust_1', name: 'Walk-in Customer', phone: '', email: '', address: '', outstanding_balance: 0, total_spent: 0, total_orders: 0, created_at: '2025-01-15T10:00:00Z' },
  { id: 'cust_2', name: 'Green Valley Restaurant', phone: '+1 555-0200', email: 'orders@greenvalley.com', address: '123 Oak St', outstanding_balance: 450.00, total_spent: 12400.50, total_orders: 38, created_at: '2025-02-01T09:00:00Z' },
  { id: 'cust_3', name: 'Maria Santos', phone: '+1 555-0201', email: 'maria.s@email.com', address: '45 Pine Ave', outstanding_balance: 0, total_spent: 890.75, total_orders: 12, created_at: '2025-02-05T14:30:00Z' },
  { id: 'cust_4', name: 'City Catering Co.', phone: '+1 555-0202', email: 'info@citycatering.com', address: '78 Business Rd', outstanding_balance: 1200.00, total_spent: 25600.00, total_orders: 65, created_at: '2025-01-20T08:00:00Z' },
  { id: 'cust_5', name: 'James Okoro', phone: '+1 555-0203', email: 'jokoro@email.com', address: '12 Hill St', outstanding_balance: 75.50, total_spent: 430.00, total_orders: 8, created_at: '2025-03-01T11:00:00Z' },
];

export const mockSuppliers: Supplier[] = [
  { id: 'sup_1', name: 'Global Foods Distributors', phone: '+1 555-0300', email: 'sales@globalfoods.com', address: '500 Industrial Blvd', outstanding_balance: 2300.00, total_purchased: 45000.00, created_at: '2025-01-10T08:00:00Z' },
  { id: 'sup_2', name: 'Fresh Farms Co.', phone: '+1 555-0301', email: 'orders@freshfarms.com', address: '300 Rural Rd', outstanding_balance: 0, total_purchased: 18500.00, created_at: '2025-01-12T09:00:00Z' },
  { id: 'sup_3', name: 'PackPro Supplies', phone: '+1 555-0302', email: 'info@packpro.com', address: '200 Commerce Dr', outstanding_balance: 850.00, total_purchased: 8200.00, created_at: '2025-02-01T10:00:00Z' },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
}

export const mockSales: Sale[] = [
  {
    id: 'sale_1', reference: 'SAL-1001', customer_id: 'cust_1', customer_name: 'Walk-in Customer',
    status: 'completed',
    line_items: [
      { id: 'li_1', product_id: 'prod_1', product_name: 'Rice 5kg Bag', quantity: 2, unit_price: 12.99, line_total: 25.98 },
      { id: 'li_2', product_id: 'prod_3', product_name: 'Sugar 1kg', quantity: 3, unit_price: 2.25, line_total: 6.75 },
    ],
    subtotal: 32.73, tax_amount: 2.62, total: 35.35, payment_method: 'cash', created_at: hoursAgo(2),
  },
  {
    id: 'sale_2', reference: 'SAL-1002', customer_id: 'cust_2', customer_name: 'Green Valley Restaurant',
    status: 'completed',
    line_items: [
      { id: 'li_3', product_id: 'prod_1', product_name: 'Rice 5kg Bag', quantity: 10, unit_price: 12.99, line_total: 129.90 },
      { id: 'li_4', product_id: 'prod_2', product_name: 'Cooking Oil 1L', quantity: 5, unit_price: 4.50, line_total: 22.50 },
    ],
    subtotal: 152.40, tax_amount: 12.19, total: 164.59, payment_method: 'card', created_at: hoursAgo(5),
  },
  {
    id: 'sale_3', reference: 'SAL-1003', customer_id: 'cust_4', customer_name: 'City Catering Co.',
    status: 'completed',
    line_items: [
      { id: 'li_5', product_id: 'prod_7', product_name: 'Canned Beans', quantity: 24, unit_price: 1.75, line_total: 42.00 },
      { id: 'li_6', product_id: 'prod_8', product_name: 'Bread Loaf', quantity: 6, unit_price: 3.25, line_total: 19.50 },
    ],
    subtotal: 61.50, tax_amount: 4.92, total: 66.42, payment_method: 'credit', created_at: hoursAgo(8),
  },
  {
    id: 'sale_4', reference: 'SAL-1004', customer_id: 'cust_1', customer_name: 'Walk-in Customer',
    status: 'completed',
    line_items: [
      { id: 'li_7', product_id: 'prod_5', product_name: 'Detergent 2kg', quantity: 1, unit_price: 8.75, line_total: 8.75 },
    ],
    subtotal: 8.75, tax_amount: 0.70, total: 9.45, payment_method: 'cash', created_at: hoursAgo(24),
  },
  {
    id: 'sale_5', reference: 'SAL-1005', customer_id: 'cust_3', customer_name: 'Maria Santos',
    status: 'refunded',
    line_items: [
      { id: 'li_8', product_id: 'prod_4', product_name: 'Bottled Water 12pk', quantity: 2, unit_price: 6.99, line_total: 13.98 },
    ],
    subtotal: 13.98, tax_amount: 1.12, total: 15.10, payment_method: 'card', created_at: daysAgo(1),
  },
  {
    id: 'sale_6', reference: 'SAL-1006', customer_id: 'cust_2', customer_name: 'Green Valley Restaurant',
    status: 'completed',
    line_items: [
      { id: 'li_9', product_id: 'prod_3', product_name: 'Sugar 1kg', quantity: 20, unit_price: 2.25, line_total: 45.00 },
      { id: 'li_10', product_id: 'prod_1', product_name: 'Rice 5kg Bag', quantity: 5, unit_price: 12.99, line_total: 64.95 },
    ],
    subtotal: 109.95, tax_amount: 8.80, total: 118.75, payment_method: 'bank_transfer', created_at: daysAgo(2),
  },
  {
    id: 'sale_7', reference: 'SAL-1007', customer_id: 'cust_5', customer_name: 'James Okoro',
    status: 'completed',
    line_items: [
      { id: 'li_11', product_id: 'prod_8', product_name: 'Bread Loaf', quantity: 4, unit_price: 3.25, line_total: 13.00 },
      { id: 'li_12', product_id: 'prod_7', product_name: 'Canned Beans', quantity: 6, unit_price: 1.75, line_total: 10.50 },
    ],
    subtotal: 23.50, tax_amount: 1.88, total: 25.38, payment_method: 'mobile_money', created_at: daysAgo(3),
  },
];

export const mockExpenses: Expense[] = [
  { id: 'exp_1', category: 'rent', amount: 2500.00, date: daysAgo(1), description: 'Monthly store rent', receipt_url: null, created_at: daysAgo(1) },
  { id: 'exp_2', category: 'utilities', amount: 340.50, date: daysAgo(2), description: 'Electricity bill', receipt_url: null, created_at: daysAgo(2) },
  { id: 'exp_3', category: 'salaries', amount: 3200.00, date: daysAgo(3), description: 'Staff salaries - 2 cashiers', receipt_url: null, created_at: daysAgo(3) },
  { id: 'exp_4', category: 'marketing', amount: 150.00, date: daysAgo(5), description: 'Facebook ads', receipt_url: null, created_at: daysAgo(5) },
  { id: 'exp_5', category: 'transport', amount: 85.00, date: daysAgo(6), description: 'Delivery fuel', receipt_url: null, created_at: daysAgo(6) },
  { id: 'exp_6', category: 'supplies', amount: 220.00, date: daysAgo(8), description: 'Shopping bags and receipt rolls', receipt_url: null, created_at: daysAgo(8) },
  { id: 'exp_7', category: 'utilities', amount: 95.00, date: daysAgo(10), description: 'Internet service', receipt_url: null, created_at: daysAgo(10) },
  { id: 'exp_8', category: 'maintenance', amount: 175.00, date: daysAgo(12), description: 'Refrigerator repair', receipt_url: null, created_at: daysAgo(12) },
];

export const mockPurchases: Purchase[] = [
  {
    id: 'pur_1', reference: 'PUR-2001', supplier_id: 'sup_1', supplier_name: 'Global Foods Distributors',
    status: 'received',
    line_items: [
      { id: 'pli_1', product_id: 'prod_1', product_name: 'Rice 5kg Bag', quantity: 50, unit_cost: 8.50, line_total: 425.00 },
      { id: 'pli_2', product_id: 'prod_3', product_name: 'Sugar 1kg', quantity: 100, unit_cost: 1.20, line_total: 120.00 },
    ],
    total: 545.00, created_at: daysAgo(2),
  },
  {
    id: 'pur_2', reference: 'PUR-2002', supplier_id: 'sup_2', supplier_name: 'Fresh Farms Co.',
    status: 'ordered',
    line_items: [
      { id: 'pli_3', product_id: 'prod_8', product_name: 'Bread Loaf', quantity: 40, unit_cost: 1.50, line_total: 60.00 },
    ],
    total: 60.00, created_at: daysAgo(1),
  },
  {
    id: 'pur_3', reference: 'PUR-2003', supplier_id: 'sup_3', supplier_name: 'PackPro Supplies',
    status: 'received',
    line_items: [
      { id: 'pli_4', product_id: 'prod_5', product_name: 'Detergent 2kg', quantity: 30, unit_cost: 5.00, line_total: 150.00 },
    ],
    total: 150.00, created_at: daysAgo(5),
  },
];

export const mockPayments: Payment[] = [
  {
    id: 'pay_1', type: 'received', amount: 164.59, method: 'card', date: hoursAgo(5),
    party_name: 'Green Valley Restaurant', party_id: 'cust_2', reference: 'PAY-3001',
    allocations: [{ id: 'alloc_1', invoice_id: 'sale_2', invoice_reference: 'SAL-1002', amount: 164.59 }],
    created_at: hoursAgo(5),
  },
  {
    id: 'pay_2', type: 'made', amount: 545.00, method: 'bank_transfer', date: daysAgo(2),
    party_name: 'Global Foods Distributors', party_id: 'sup_1', reference: 'PAY-3002',
    allocations: [{ id: 'alloc_2', invoice_id: 'pur_1', invoice_reference: 'PUR-2001', amount: 545.00 }],
    created_at: daysAgo(2),
  },
  {
    id: 'pay_3', type: 'received', amount: 300.00, method: 'cash', date: daysAgo(1),
    party_name: 'City Catering Co.', party_id: 'cust_4', reference: 'PAY-3003',
    allocations: [{ id: 'alloc_3', invoice_id: 'sale_prev_1', invoice_reference: 'SAL-0998', amount: 300.00 }],
    created_at: daysAgo(1),
  },
];

export const mockReceivables: ReceivableItem[] = [
  { id: 'ar_1', customer_name: 'City Catering Co.', invoice_reference: 'SAL-0995', amount: 1200.00, due_date: daysAgo(5), days_overdue: 5 },
  { id: 'ar_2', customer_name: 'Green Valley Restaurant', invoice_reference: 'SAL-0998', amount: 450.00, due_date: daysAgo(2), days_overdue: 2 },
  { id: 'ar_3', customer_name: 'James Okoro', invoice_reference: 'SAL-0999', amount: 75.50, due_date: daysAgo(0), days_overdue: 0 },
  { id: 'ar_4', customer_name: 'City Catering Co.', invoice_reference: 'SAL-0990', amount: 680.00, due_date: daysAgo(35), days_overdue: 35 },
  { id: 'ar_5', customer_name: 'Green Valley Restaurant', invoice_reference: 'SAL-0985', amount: 320.00, due_date: daysAgo(65), days_overdue: 65 },
];

export const mockPayables: PayableItem[] = [
  { id: 'ap_1', supplier_name: 'Global Foods Distributors', bill_reference: 'PUR-1990', amount: 2300.00, due_date: daysAgo(3), days_overdue: 3 },
  { id: 'ap_2', supplier_name: 'PackPro Supplies', bill_reference: 'PUR-1985', amount: 850.00, due_date: daysAgo(10), days_overdue: 10 },
  { id: 'ap_3', supplier_name: 'Global Foods Distributors', bill_reference: 'PUR-1980', amount: 1500.00, due_date: daysAgo(45), days_overdue: 45 },
];

export const mockTodaySummary: TodaySummary = {
  revenue: 35.35 + 164.59 + 66.42 + 9.45,
  orders: 4,
  new_customers: 2,
  successful_payments: 3,
  failed_payments: 1,
  low_stock_count: 3,
};

export const mockAttentionItems: AttentionItem[] = [
  {
    id: 'att_1', severity: 'critical',
    title: 'Payment Failed',
    message: 'A card payment of $15.10 from Maria Santos was declined. The sale has been refunded.',
    action_label: 'Review failed payments', action_route: '/(tabs)/money',
    created_at: hoursAgo(1),
  },
  {
    id: 'att_2', severity: 'high',
    title: 'Low Stock Alert',
    message: '3 products are below their minimum stock level: Cooking Oil 1L, Bottled Water 12pk, Tea Bags 100ct.',
    action_label: 'Review inventory', action_route: '/(tabs)/sales',
    created_at: hoursAgo(3),
  },
  {
    id: 'att_3', severity: 'medium',
    title: 'Overdue Payment',
    message: 'City Catering Co. has an invoice of $1,200.00 that is 5 days overdue.',
    action_label: 'View receivables', action_route: '/(tabs)/money',
    created_at: hoursAgo(5),
  },
  {
    id: 'att_4', severity: 'low',
    title: 'New Customer',
    message: '2 new customers registered today. Welcome them with a follow-up message.',
    action_label: 'View customers', action_route: '/(tabs)/more',
    created_at: hoursAgo(8),
  },
];

export const mockHelpArticles: HelpArticle[] = [
  { id: 'help_1', title: 'Recording a Sale', category: 'Sales', content: 'To record a sale, tap the Sales tab, then "Record Sale". Select products from your inventory or enter a custom item. Choose the customer (or "Walk-in Customer" for walk-ins), set quantities, and confirm the total. The sale is immediately recorded in your books.', related_module: 'sales' },
  { id: 'help_2', title: 'Managing Inventory', category: 'Sales', content: 'Go to Sales > Products to view all products. Tap any product to edit its price, stock level, or low-stock threshold. Use "Adjust Stock" to manually correct stock levels with a reason note for your records.', related_module: 'sales' },
  { id: 'help_3', title: 'Recording Expenses', category: 'Money', content: 'In the Money tab, tap "Add Expense". Select a category, enter the amount and date, and add a description. You can optionally attach a receipt photo.', related_module: 'money' },
  { id: 'help_4', title: 'Understanding Reports', category: 'Reports', content: 'The Reports tab provides three core financial statements: Income Statement (what you earned vs spent), Balance Sheet (what you own vs owe), and Cash Flow (money in and out). Tap any line item to see the transactions behind it.', related_module: 'reports' },
  { id: 'help_5', title: 'Managing Customers', category: 'Customers', content: 'In the More tab, tap Customers to see all your customers. Tap any customer to view their purchase history, outstanding balance, and contact information.', related_module: 'customers' },
  { id: 'help_6', title: 'Using the AI Assistant', category: 'AI Assistant', content: 'The AI Assistant can answer questions about your business data. Ask things like "Why did profit change this month?" or "Who owes us money?" Answers are labeled as facts, calculations, forecasts, or recommendations.', related_module: 'ai' },
  { id: 'help_7', title: 'Setting Up Your Business Profile', category: 'Settings', content: 'Go to More > Settings > Business Profile to update your business name, currency, timezone, and industry. These settings affect how numbers appear throughout the app.', related_module: 'settings' },
  { id: 'help_8', title: 'Recording Payments', category: 'Money', content: 'In the Money tab, tap "Record Payment". Choose whether you received or made a payment. You can allocate a single payment across multiple invoices or bills.', related_module: 'money' },
];

export const mockAIMessages: AIMessage[] = [
  {
    id: 'ai_1', role: 'user',
    content: 'Why did profit change this month?',
    created_at: daysAgo(2),
  },
  {
    id: 'ai_2', role: 'assistant',
    content: 'Your net profit decreased by 18% this month compared to last month. The main driver was a 32% increase in operating expenses, primarily from a $175 refrigerator repair and higher staff salaries. Revenue was roughly flat (down 2%).\n\nRecommendation: Review your operating expense categories to see if the repair and salary increases are one-time or recurring.',
    answer_type: 'calculation',
    sources: ['Income Statement', 'Expense Ledger'],
    created_at: daysAgo(2),
  },
  {
    id: 'ai_3', role: 'user',
    content: 'Who owes us money?',
    created_at: daysAgo(1),
  },
  {
    id: 'ai_4', role: 'assistant',
    content: 'As of today, 3 customers owe you a total of $2,025.50:\n\n• City Catering Co. — $1,880.00 (2 invoices, one 35 days overdue)\n• Green Valley Restaurant — $450.00 (2 days overdue)\n• James Okoro — $75.50 (due today)\n\nRecommendation: Follow up with City Catering Co. on the 35-day overdue invoice first.',
    answer_type: 'fact',
    sources: ['Accounts Receivable Ledger'],
    created_at: daysAgo(1),
  },
];

export const mockAIStarterQuestions = [
  'Why did profit change this month?',
  'Who owes us money?',
  'What are our top-selling products?',
  'How much did we spend on supplies this week?',
  'What should I order to restock?',
  'Compare this month\'s revenue to last month',
];
