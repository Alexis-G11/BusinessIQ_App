// Customers & Suppliers API — mock implementation

import type { Customer, Supplier } from '../lib/types';
import { mockDelay, uid } from './client';
import { mockCustomers, mockSuppliers, mockSales, mockPayments } from './mock-data';

let customers: Customer[] = [...mockCustomers];
let suppliers: Supplier[] = [...mockSuppliers];

export async function getCustomers(): Promise<Customer[]> {
  await mockDelay(300, 600);
  return [...customers];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  await mockDelay(200, 400);
  return customers.find((c) => c.id === id) ?? null;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  await mockDelay(400, 800);
  const customer: Customer = {
    id: uid('cust'),
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    outstanding_balance: 0,
    total_spent: 0,
    total_orders: 0,
    created_at: new Date().toISOString(),
  };
  customers = [customer, ...customers];
  return customer;
}

export async function updateCustomer(id: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
  await mockDelay(400, 800);
  customers = customers.map((c) => (c.id === id ? { ...c, ...input } : c));
  return customers.find((c) => c.id === id)!;
}

export async function getCustomerSales(customerId: string) {
  await mockDelay(300, 600);
  return mockSales.filter((s) => s.customer_id === customerId);
}

export async function getCustomerPayments(customerId: string) {
  await mockDelay(300, 600);
  return mockPayments.filter((p) => p.party_id === customerId);
}

export async function getSuppliers(): Promise<Supplier[]> {
  await mockDelay(300, 600);
  return [...suppliers];
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  await mockDelay(200, 400);
  return suppliers.find((s) => s.id === id) ?? null;
}

export interface CreateSupplierInput {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  await mockDelay(400, 800);
  const supplier: Supplier = {
    id: uid('sup'),
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    outstanding_balance: 0,
    total_purchased: 0,
    created_at: new Date().toISOString(),
  };
  suppliers = [supplier, ...suppliers];
  return supplier;
}

export async function updateSupplier(id: string, input: Partial<CreateSupplierInput>): Promise<Supplier> {
  await mockDelay(400, 800);
  suppliers = suppliers.map((s) => (s.id === id ? { ...s, ...input } : s));
  return suppliers.find((s) => s.id === id)!;
}
