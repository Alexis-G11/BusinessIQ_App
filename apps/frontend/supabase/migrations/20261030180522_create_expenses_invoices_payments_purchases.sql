/*
# BusinessIQ — Expenses, Invoices, Invoice Items, Payments, Purchases, Purchase Items

1. New Tables
- `expenses` — business expenses with category, date, payment method
- `invoices` — invoices to customers with due dates and status
- `invoice_items` — line items per invoice
- `payments` — payments from customers or to suppliers
- `purchases` — purchase orders from suppliers
- `purchase_items` — line items per purchase

2. Security
- RLS on all tables, scoped to authenticated business members
- All CRUD checks active membership via subquery
*/

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  recurring boolean NOT NULL DEFAULT false,
  recurring_interval text DEFAULT 'none',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;

DROP POLICY IF EXISTS "expenses_select_member" ON expenses;
CREATE POLICY "expenses_select_member" ON expenses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = expenses.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "expenses_insert_member" ON expenses;
CREATE POLICY "expenses_insert_member" ON expenses FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = expenses.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "expenses_update_member" ON expenses;
CREATE POLICY "expenses_update_member" ON expenses FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = expenses.business_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = expenses.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "expenses_delete_member" ON expenses;
CREATE POLICY "expenses_delete_member" ON expenses FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = expenses.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON expenses(business_id, expense_date DESC);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;

DROP POLICY IF EXISTS "invoices_select_member" ON invoices;
CREATE POLICY "invoices_select_member" ON invoices FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = invoices.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "invoices_insert_member" ON invoices;
CREATE POLICY "invoices_insert_member" ON invoices FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = invoices.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "invoices_update_member" ON invoices;
CREATE POLICY "invoices_update_member" ON invoices FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = invoices.business_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = invoices.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "invoices_delete_member" ON invoices;
CREATE POLICY "invoices_delete_member" ON invoices FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = invoices.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_invoices_business_created ON invoices(business_id, created_at DESC);

-- INVOICE_ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_items TO authenticated;

DROP POLICY IF EXISTS "invoice_items_select_member" ON invoice_items;
CREATE POLICY "invoice_items_select_member" ON invoice_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM invoices i JOIN memberships m ON m.business_id = i.business_id WHERE i.id = invoice_items.invoice_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "invoice_items_insert_member" ON invoice_items;
CREATE POLICY "invoice_items_insert_member" ON invoice_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM invoices i JOIN memberships m ON m.business_id = i.business_id WHERE i.id = invoice_items.invoice_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "invoice_items_update_member" ON invoice_items;
CREATE POLICY "invoice_items_update_member" ON invoice_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM invoices i JOIN memberships m ON m.business_id = i.business_id WHERE i.id = invoice_items.invoice_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM invoices i JOIN memberships m ON m.business_id = i.business_id WHERE i.id = invoice_items.invoice_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "invoice_items_delete_member" ON invoice_items;
CREATE POLICY "invoice_items_delete_member" ON invoice_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM invoices i JOIN memberships m ON m.business_id = i.business_id WHERE i.id = invoice_items.invoice_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  payment_number text NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  contact_type text NOT NULL DEFAULT 'customer',
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated;

DROP POLICY IF EXISTS "payments_select_member" ON payments;
CREATE POLICY "payments_select_member" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = payments.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "payments_insert_member" ON payments;
CREATE POLICY "payments_insert_member" ON payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = payments.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "payments_update_member" ON payments;
CREATE POLICY "payments_update_member" ON payments FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = payments.business_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = payments.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "payments_delete_member" ON payments;
CREATE POLICY "payments_delete_member" ON payments FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = payments.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_payments_business_created ON payments(business_id, created_at DESC);

-- PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  purchase_number text NOT NULL,
  supplier_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name text NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ordered',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchases TO authenticated;

DROP POLICY IF EXISTS "purchases_select_member" ON purchases;
CREATE POLICY "purchases_select_member" ON purchases FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = purchases.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "purchases_insert_member" ON purchases;
CREATE POLICY "purchases_insert_member" ON purchases FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = purchases.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "purchases_update_member" ON purchases;
CREATE POLICY "purchases_update_member" ON purchases FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = purchases.business_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = purchases.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "purchases_delete_member" ON purchases;
CREATE POLICY "purchases_delete_member" ON purchases FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = purchases.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_purchases_business_created ON purchases(business_id, created_at DESC);

-- PURCHASE_ITEMS
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_items TO authenticated;

DROP POLICY IF EXISTS "purchase_items_select_member" ON purchase_items;
CREATE POLICY "purchase_items_select_member" ON purchase_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM purchases p JOIN memberships m ON m.business_id = p.business_id WHERE p.id = purchase_items.purchase_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "purchase_items_insert_member" ON purchase_items;
CREATE POLICY "purchase_items_insert_member" ON purchase_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM purchases p JOIN memberships m ON m.business_id = p.business_id WHERE p.id = purchase_items.purchase_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "purchase_items_update_member" ON purchase_items;
CREATE POLICY "purchase_items_update_member" ON purchase_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM purchases p JOIN memberships m ON m.business_id = p.business_id WHERE p.id = purchase_items.purchase_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM purchases p JOIN memberships m ON m.business_id = p.business_id WHERE p.id = purchase_items.purchase_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "purchase_items_delete_member" ON purchase_items;
CREATE POLICY "purchase_items_delete_member" ON purchase_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM purchases p JOIN memberships m ON m.business_id = p.business_id WHERE p.id = purchase_items.purchase_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
