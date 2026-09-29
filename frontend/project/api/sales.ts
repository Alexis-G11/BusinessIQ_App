// Sales & Inventory API — mock implementation

import type { Product, Sale, SaleLineItem, Category, SalesFilter } from '../lib/types';
import { mockDelay, uid } from './client';
import { mockProducts, mockSales, mockCustomers } from './mock-data';

let products: Product[] = [...mockProducts];
let sales: Sale[] = [...mockSales];

export async function getProducts(): Promise<Product[]> {
  await mockDelay(300, 600);
  return [...products];
}

export async function getProduct(id: string): Promise<Product | null> {
  await mockDelay(200, 400);
  return products.find((p) => p.id === id) ?? null;
}

export async function createProduct(input: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
  await mockDelay(400, 800);
  const product: Product = { ...input, id: uid('prod'), created_at: new Date().toISOString() };
  products = [product, ...products];
  return product;
}

export async function updateProduct(id: string, input: Partial<Product>): Promise<Product> {
  await mockDelay(400, 800);
  products = products.map((p) => (p.id === id ? { ...p, ...input } : p));
  return products.find((p) => p.id === id)!;
}

export async function adjustStock(id: string, newQuantity: number, reason: string): Promise<Product> {
  await mockDelay(300, 600);
  void reason;
  products = products.map((p) => (p.id === id ? { ...p, stock_quantity: newQuantity } : p));
  return products.find((p) => p.id === id)!;
}

export async function getCategories(): Promise<Category[]> {
  await mockDelay(200, 400);
  const map = new Map<string, number>();
  products.forEach((p) => map.set(p.category, (map.get(p.category) ?? 0) + 1));
  return Array.from(map.entries()).map(([name, count], i) => ({ id: `cat_${i}`, name, product_count: count }));
}

export async function getSales(filter?: SalesFilter): Promise<Sale[]> {
  await mockDelay(300, 600);
  let result = [...sales];
  if (filter?.status) result = result.filter((s) => s.status === filter.status);
  if (filter?.customer_id) result = result.filter((s) => s.customer_id === filter.customer_id);
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return result;
}

export async function getSale(id: string): Promise<Sale | null> {
  await mockDelay(200, 400);
  return sales.find((s) => s.id === id) ?? null;
}

export interface CreateSaleInput {
  customer_id: string | null;
  line_items: { product_id: string; quantity: number }[];
  payment_method: Sale['payment_method'];
}

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  await mockDelay(500, 1000);
  const customer = mockCustomers.find((c) => c.id === input.customer_id);
  const lineItems: SaleLineItem[] = input.line_items.map((li) => {
    const product = products.find((p) => p.id === li.product_id);
    const unitPrice = product?.price ?? 0;
    return {
      id: uid('li'),
      product_id: li.product_id,
      product_name: product?.name ?? 'Custom Item',
      quantity: li.quantity,
      unit_price: unitPrice,
      line_total: unitPrice * li.quantity,
    };
  });
  const subtotal = lineItems.reduce((sum, li) => sum + li.line_total, 0);
  const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + taxAmount;
  const ref = `SAL-${1000 + sales.length + 1}`;
  const sale: Sale = {
    id: uid('sale'),
    reference: ref,
    customer_id: input.customer_id,
    customer_name: customer?.name ?? 'Walk-in Customer',
    status: 'completed',
    line_items: lineItems,
    subtotal,
    tax_amount: taxAmount,
    total,
    payment_method: input.payment_method,
    created_at: new Date().toISOString(),
  };
  sales = [sale, ...sales];
  // Reduce stock
  input.line_items.forEach((li) => {
    products = products.map((p) => (p.id === li.product_id ? { ...p, stock_quantity: p.stock_quantity - li.quantity } : p));
  });
  return sale;
}
