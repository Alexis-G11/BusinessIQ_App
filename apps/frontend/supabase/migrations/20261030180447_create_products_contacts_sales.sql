/*
# BusinessIQ — Products, Contacts, Sales, Sale Items

1. New Tables
- `products` — catalog items with stock, prices, reorder threshold
- `contacts` — customers and suppliers (type discriminator)
- `sales` — POS transactions with totals, status, payment method
- `sale_items` — line items per sale

2. Security
- RLS on all tables, scoped to authenticated members of the business
- All CRUD operations check active membership via subquery
*/

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id uuid,
  name text NOT NULL,
  sku text,
  barcode text,
  description text,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  stock_quantity numeric NOT NULL DEFAULT 0,
  reorder_threshold numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;

DROP POLICY IF EXISTS "products_select_member" ON products;
CREATE POLICY "products_select_member" ON products FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = products.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "products_insert_member" ON products;
CREATE POLICY "products_insert_member" ON products FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = products.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "products_update_member" ON products;
CREATE POLICY "products_update_member" ON products FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = products.business_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = products.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "products_delete_member" ON products;
CREATE POLICY "products_delete_member" ON products FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = products.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);

-- CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'customer',
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  opening_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;

DROP POLICY IF EXISTS "contacts_select_member" ON contacts;
CREATE POLICY "contacts_select_member" ON contacts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = contacts.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "contacts_insert_member" ON contacts;
CREATE POLICY "contacts_insert_member" ON contacts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = contacts.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "contacts_update_member" ON contacts;
CREATE POLICY "contacts_update_member" ON contacts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = contacts.business_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = contacts.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "contacts_delete_member" ON contacts;
CREATE POLICY "contacts_delete_member" ON contacts FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = contacts.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_contacts_business_type ON contacts(business_id, type);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_number text NOT NULL,
  customer_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  payment_method text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO authenticated;

DROP POLICY IF EXISTS "sales_select_member" ON sales;
CREATE POLICY "sales_select_member" ON sales FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = sales.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "sales_insert_member" ON sales;
CREATE POLICY "sales_insert_member" ON sales FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = sales.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "sales_update_member" ON sales;
CREATE POLICY "sales_update_member" ON sales FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = sales.business_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = sales.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "sales_delete_member" ON sales;
CREATE POLICY "sales_delete_member" ON sales FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships m WHERE m.business_id = sales.business_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_sales_business_created ON sales(business_id, created_at DESC);

-- SALE_ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sale_items TO authenticated;

DROP POLICY IF EXISTS "sale_items_all_member" ON sale_items;
CREATE POLICY "sale_items_all_member" ON sale_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM sales s JOIN memberships m ON m.business_id = s.business_id WHERE s.id = sale_items.sale_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "sale_items_insert_member" ON sale_items;
CREATE POLICY "sale_items_insert_member" ON sale_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM sales s JOIN memberships m ON m.business_id = s.business_id WHERE s.id = sale_items.sale_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "sale_items_update_member" ON sale_items;
CREATE POLICY "sale_items_update_member" ON sale_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM sales s JOIN memberships m ON m.business_id = s.business_id WHERE s.id = sale_items.sale_id AND m.user_id = auth.uid() AND m.status = 'active')
) WITH CHECK (
  EXISTS (SELECT 1 FROM sales s JOIN memberships m ON m.business_id = s.business_id WHERE s.id = sale_items.sale_id AND m.user_id = auth.uid() AND m.status = 'active')
);
DROP POLICY IF EXISTS "sale_items_delete_member" ON sale_items;
CREATE POLICY "sale_items_delete_member" ON sale_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM sales s JOIN memberships m ON m.business_id = s.business_id WHERE s.id = sale_items.sale_id AND m.user_id = auth.uid() AND m.status = 'active')
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
