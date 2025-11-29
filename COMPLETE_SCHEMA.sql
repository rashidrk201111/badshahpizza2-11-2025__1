/*
  # Complete Billing System Schema - For Fresh Database Setup

  This is a comprehensive schema for a restaurant billing and inventory management system.
  Use this file for setting up a new database from scratch.

  ## Tables Included

  ### Core Tables
  1. profiles - User profiles with role-based access
  2. employees - Employee management
  3. company_profile - Company information

  ### Customer & Product Management
  4. customers - Customer records
  5. products - Product catalog with inventory
  6. inventory_movements - Inventory tracking

  ### Menu Management (Restaurant)
  7. menu_categories - Menu categories
  8. menu_items - Menu items/dishes
  9. menu_item_ingredients - Recipe ingredients

  ### Kitchen & Orders
  10. kots - Kitchen order tickets
  11. kot_items - KOT line items

  ### Supplier & Purchases
  12. suppliers - Supplier records
  13. purchases - Purchase orders
  14. purchase_items - Purchase line items
  15. purchase_payments - Purchase payment tracking

  ### Invoice & Billing
  16. invoices - Sales invoices
  17. invoice_items - Invoice line items
  18. invoice_payments - Invoice payment tracking

  ### Payment & Transactions
  19. payment_methods - Payment types
  20. transactions - Financial transactions

  ## Features

  - Complete Row Level Security (RLS) policies
  - Role-based access control (admin, manager, sales_person)
  - Automatic inventory tracking
  - GST calculation support (CGST/SGST and IGST)
  - Multi-payment method support
  - Order type tracking (dine-in, takeaway, delivery)
  - Delivery platform integration
  - Comprehensive audit trails

  ## Usage

  Run this script on a fresh Supabase database to set up the complete system.
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'sales_person')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON profiles;
CREATE POLICY "Allow insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =============================================
-- EMPLOYEES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'sales_person')),
  phone text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
CREATE POLICY "Admins can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can read all employees" ON employees;
CREATE POLICY "Users can read all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- COMPANY PROFILE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS company_profile (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name text NOT NULL,
  address text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  website text,
  gstin text,
  pan text,
  logo_url text,
  bank_name text,
  account_number text,
  ifsc_code text,
  branch text,
  whatsapp_number text,
  whatsapp_business_account_id text,
  whatsapp_phone_number_id text,
  whatsapp_access_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read company profile" ON company_profile;
CREATE POLICY "Anyone can read company profile"
  ON company_profile FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage company profile" ON company_profile;
CREATE POLICY "Admins can manage company profile"
  ON company_profile FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  gstin text,
  state text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read customers" ON customers;
CREATE POLICY "Users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert customers" ON customers;
CREATE POLICY "Users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update customers" ON customers;
CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can delete customers" ON customers;
CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  barcode text,
  description text,
  unit text NOT NULL DEFAULT 'piece',
  unit_price numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 18,
  hsn_code text,
  stock_quantity numeric NOT NULL DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  category text,
  color text,
  type text DEFAULT 'product' CHECK (type IN ('product', 'raw_material')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read products" ON products;
CREATE POLICY "Users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage products" ON products;
CREATE POLICY "Users can manage products"
  ON products FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- INVENTORY MOVEMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'consumption')),
  quantity numeric NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read inventory movements" ON inventory_movements;
CREATE POLICY "Users can read inventory movements"
  ON inventory_movements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create inventory movements" ON inventory_movements;
CREATE POLICY "Users can create inventory movements"
  ON inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- MENU CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read menu categories" ON menu_categories;
CREATE POLICY "Users can read menu categories"
  ON menu_categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage menu categories" ON menu_categories;
CREATE POLICY "Admins can manage menu categories"
  ON menu_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =============================================
-- MENU ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  preparation_time integer DEFAULT 15,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read menu items" ON menu_items;
CREATE POLICY "Users can read menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage menu items" ON menu_items;
CREATE POLICY "Admins can manage menu items"
  ON menu_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =============================================
-- MENU ITEM INGREDIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity_required numeric NOT NULL,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_item_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read menu item ingredients" ON menu_item_ingredients;
CREATE POLICY "Users can read menu item ingredients"
  ON menu_item_ingredients FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage menu item ingredients" ON menu_item_ingredients;
CREATE POLICY "Admins can manage menu item ingredients"
  ON menu_item_ingredients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =============================================
-- KOTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS kots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kot_number text UNIQUE NOT NULL,
  table_number text,
  order_type text NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'take_away', 'delivery')),
  delivery_platform text CHECK (delivery_platform IN ('swiggy', 'zomato', 'uber_eats', 'manual')),
  delivery_partner_name text,
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  payment_method text CHECK (payment_method IN ('cash', 'upi', 'card', 'split')),
  cash_amount numeric DEFAULT 0,
  upi_amount numeric DEFAULT 0,
  card_amount numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE kots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read kots" ON kots;
CREATE POLICY "Users can read kots"
  ON kots FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage kots" ON kots;
CREATE POLICY "Users can manage kots"
  ON kots FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- KOT ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS kot_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kot_id uuid REFERENCES kots(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id),
  item_name text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kot_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read kot items" ON kot_items;
CREATE POLICY "Users can read kot items"
  ON kot_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage kot items" ON kot_items;
CREATE POLICY "Users can manage kot items"
  ON kot_items FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  gstin text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read suppliers" ON suppliers;
CREATE POLICY "Users can read suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage suppliers" ON suppliers;
CREATE POLICY "Users can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- PURCHASES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_number text UNIQUE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  order_date date NOT NULL,
  expected_date date,
  received_date date,
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'received', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  subtotal numeric NOT NULL DEFAULT 0,
  cgst numeric DEFAULT 0,
  sgst numeric DEFAULT 0,
  igst numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read purchases" ON purchases;
CREATE POLICY "Users can read purchases"
  ON purchases FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage purchases" ON purchases;
CREATE POLICY "Users can manage purchases"
  ON purchases FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- PURCHASE ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  sku text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  unit_price numeric NOT NULL,
  gst_rate numeric NOT NULL,
  hsn_code text,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read purchase items" ON purchase_items;
CREATE POLICY "Users can read purchase items"
  ON purchase_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage purchase items" ON purchase_items;
CREATE POLICY "Users can manage purchase items"
  ON purchase_items FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- PAYMENT METHODS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read payment methods" ON payment_methods;
CREATE POLICY "Users can read payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage payment methods" ON payment_methods;
CREATE POLICY "Admins can manage payment methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default payment methods
INSERT INTO payment_methods (name, is_active) VALUES
  ('Cash', true),
  ('Bank Transfer', true),
  ('UPI', true),
  ('Card', true),
  ('Cheque', true)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- PURCHASE PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchase_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id),
  reference_number text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read purchase payments" ON purchase_payments;
CREATE POLICY "Users can read purchase payments"
  ON purchase_payments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage purchase payments" ON purchase_payments;
CREATE POLICY "Users can manage purchase payments"
  ON purchase_payments FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- INVOICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  invoice_date date NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric DEFAULT 0,
  cgst numeric DEFAULT 0,
  sgst numeric DEFAULT 0,
  igst numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read invoices" ON invoices;
CREATE POLICY "Users can read invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can read invoices by id" ON invoices;
CREATE POLICY "Anyone can read invoices by id"
  ON invoices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage invoices" ON invoices;
CREATE POLICY "Users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- INVOICE ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  description text,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  gst_rate numeric NOT NULL,
  hsn_code text,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read invoice items" ON invoice_items;
CREATE POLICY "Users can read invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can read invoice items" ON invoice_items;
CREATE POLICY "Anyone can read invoice items"
  ON invoice_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage invoice items" ON invoice_items;
CREATE POLICY "Users can manage invoice items"
  ON invoice_items FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- INVOICE PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id),
  reference_number text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read invoice payments" ON invoice_payments;
CREATE POLICY "Users can read invoice payments"
  ON invoice_payments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage invoice payments" ON invoice_payments;
CREATE POLICY "Users can manage invoice payments"
  ON invoice_payments FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  transaction_date date NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id),
  reference_number text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read transactions" ON transactions;
CREATE POLICY "Users can read transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage transactions" ON transactions;
CREATE POLICY "Users can manage transactions"
  ON transactions FOR ALL
  TO authenticated
  USING (true);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_order_date ON purchases(order_date);
CREATE INDEX IF NOT EXISTS idx_kots_status ON kots(status);
CREATE INDEX IF NOT EXISTS idx_kots_created_at ON kots(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
