-- Stock Opname Database Schema for Supabase
-- Created: 2026-10-16

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. PRODUCTS TABLE
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  system_stock INTEGER NOT NULL DEFAULT 0 CHECK (system_stock >= 0),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. SO_SESSIONS TABLE
-- ============================================================
CREATE TABLE so_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_code TEXT UNIQUE NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  total_items INTEGER NOT NULL DEFAULT 0,
  counted_items INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. SO_ITEMS TABLE
-- ============================================================
CREATE TABLE so_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES so_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  system_stock INTEGER NOT NULL,
  physical_stock INTEGER,
  variance INTEGER GENERATED ALWAYS AS (physical_stock - system_stock) STORED,
  is_counted BOOLEAN DEFAULT false,
  counted_at TIMESTAMP WITH TIME ZONE,
  counted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. AUDIT_LOGS TABLE
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_value JSONB,
  after_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Products indexes
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_barcode ON products(barcode);

-- SO_Sessions indexes
CREATE INDEX idx_so_sessions_category_id ON so_sessions(category_id);
CREATE INDEX idx_so_sessions_user_id ON so_sessions(user_id);
CREATE INDEX idx_so_sessions_status ON so_sessions(status);
CREATE INDEX idx_so_sessions_created_at ON so_sessions(created_at);

-- SO_Items indexes
CREATE INDEX idx_so_items_session_id ON so_items(session_id);
CREATE INDEX idx_so_items_product_id ON so_items(product_id);
CREATE INDEX idx_so_items_is_counted ON so_items(is_counted);

-- Audit_Logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE so_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Role lookup must bypass RLS. A policy on users that SELECTs users
-- re-enters the same policy and Postgres raises 42P17.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- USERS POLICIES
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING ((SELECT private.is_admin()));

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- CATEGORIES POLICIES
CREATE POLICY "Categories are readable by all authenticated users" ON categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert categories" ON categories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Only admins can update categories" ON categories
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- PRODUCTS POLICIES
CREATE POLICY "Products are readable by all authenticated users" ON products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert products" ON products
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Only admins can update products" ON products
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- SO_SESSIONS POLICIES
CREATE POLICY "Sessions are readable by owner or admin" ON so_sessions
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = user_id OR (SELECT private.is_admin())
  );

CREATE POLICY "Staff can create sessions" ON so_sessions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Staff can update their own sessions" ON so_sessions
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can update any session" ON so_sessions
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

-- SO_ITEMS POLICIES
CREATE POLICY "Items are readable with session access" ON so_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM so_sessions
      WHERE id = so_items.session_id AND (
        (SELECT auth.uid()) = user_id OR (SELECT private.is_admin())
      )
    )
  );

CREATE POLICY "Items can be inserted by session owner" ON so_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM so_sessions
      WHERE id = so_items.session_id AND (SELECT auth.uid()) = user_id
    )
  );

CREATE POLICY "Items can be updated by session owner" ON so_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM so_sessions
      WHERE id = so_items.session_id AND (SELECT auth.uid()) = user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM so_sessions
      WHERE id = so_items.session_id AND (SELECT auth.uid()) = user_id
    )
  );

-- AUDIT_LOGS POLICIES
CREATE POLICY "Audit logs are readable by admins" ON audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "Audit logs can be inserted by system" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- TRIGGERS FOR AUDIT LOGGING
-- ============================================================

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    before_value,
    after_value
  ) VALUES (
    auth.uid()::uuid,
    TG_ARGV[0],
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit triggers for SO_ITEMS
CREATE TRIGGER audit_so_items_insert
AFTER INSERT ON so_items FOR EACH ROW
EXECUTE FUNCTION audit_log_trigger('INSERT');

CREATE TRIGGER audit_so_items_update
AFTER UPDATE ON so_items FOR EACH ROW
EXECUTE FUNCTION audit_log_trigger('UPDATE');

CREATE TRIGGER audit_so_sessions_insert
AFTER INSERT ON so_sessions FOR EACH ROW
EXECUTE FUNCTION audit_log_trigger('INSERT');

CREATE TRIGGER audit_so_sessions_update
AFTER UPDATE ON so_sessions FOR EACH ROW
EXECUTE FUNCTION audit_log_trigger('UPDATE');

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_session_progress(session_id UUID)
RETURNS TABLE (
  total_items INTEGER,
  counted_items INTEGER,
  progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE is_counted = true)::INTEGER,
    ROUND(COUNT(*) FILTER (WHERE is_counted = true)::NUMERIC / COUNT(*)::NUMERIC * 100, 2)
  FROM so_items
  WHERE session_id = $1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SO-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || 
         LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
