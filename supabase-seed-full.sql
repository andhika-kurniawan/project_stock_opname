-- ==============================================================================
-- FULL DATABASE SETUP & SEED SCRIPT FOR STOCK OPNAME SYSTEM
-- ==============================================================================
-- Jalankan skrip ini langsung di menu SQL Editor pada Supabase Dashboard Anda.
-- Skrip ini akan:
-- 1. Mengatur hak akses RLS (Row Level Security) agar tabel dapat diakses
--    secara dinamis dari Web Dashboard & Mobile App.
-- 2. Mengisi data riil (Categories, Products, Users, Active Sessions, SO Items, Completed Sessions, & Audit Logs).
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PERMISSIONS GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. PERMISSIVE RLS POLICIES FOR DEVELOPMENT & TESTING
-- Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users select" ON public.users;
DROP POLICY IF EXISTS "Allow all users insert" ON public.users;
DROP POLICY IF EXISTS "Allow all users update" ON public.users;
DROP POLICY IF EXISTS "Allow all users delete" ON public.users;
CREATE POLICY "Allow all users select" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow all users insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all users update" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all users delete" ON public.users FOR DELETE USING (true);

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all categories select" ON public.categories;
DROP POLICY IF EXISTS "Allow all categories insert" ON public.categories;
DROP POLICY IF EXISTS "Allow all categories update" ON public.categories;
DROP POLICY IF EXISTS "Allow all categories delete" ON public.categories;
CREATE POLICY "Allow all categories select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow all categories insert" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all categories update" ON public.categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all categories delete" ON public.categories FOR DELETE USING (true);

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all products select" ON public.products;
DROP POLICY IF EXISTS "Allow all products insert" ON public.products;
DROP POLICY IF EXISTS "Allow all products update" ON public.products;
DROP POLICY IF EXISTS "Allow all products delete" ON public.products;
CREATE POLICY "Allow all products select" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow all products insert" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all products update" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products delete" ON public.products FOR DELETE USING (true);

-- SO Sessions
ALTER TABLE public.so_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all so_sessions select" ON public.so_sessions;
DROP POLICY IF EXISTS "Allow all so_sessions insert" ON public.so_sessions;
DROP POLICY IF EXISTS "Allow all so_sessions update" ON public.so_sessions;
DROP POLICY IF EXISTS "Allow all so_sessions delete" ON public.so_sessions;
CREATE POLICY "Allow all so_sessions select" ON public.so_sessions FOR SELECT USING (true);
CREATE POLICY "Allow all so_sessions insert" ON public.so_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all so_sessions update" ON public.so_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all so_sessions delete" ON public.so_sessions FOR DELETE USING (true);

-- SO Items
ALTER TABLE public.so_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all so_items select" ON public.so_items;
DROP POLICY IF EXISTS "Allow all so_items insert" ON public.so_items;
DROP POLICY IF EXISTS "Allow all so_items update" ON public.so_items;
DROP POLICY IF EXISTS "Allow all so_items delete" ON public.so_items;
CREATE POLICY "Allow all so_items select" ON public.so_items FOR SELECT USING (true);
CREATE POLICY "Allow all so_items insert" ON public.so_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all so_items update" ON public.so_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all so_items delete" ON public.so_items FOR DELETE USING (true);

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all audit_logs select" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all audit_logs insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all audit_logs update" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all audit_logs delete" ON public.audit_logs;
CREATE POLICY "Allow all audit_logs select" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow all audit_logs insert" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all audit_logs update" ON public.audit_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all audit_logs delete" ON public.audit_logs FOR DELETE USING (true);

-- 4. ENSURE OPTIONAL COLUMNS EXIST
DO $$
BEGIN
  -- Kolom tambahan pada users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assigned_zone') THEN
    ALTER TABLE public.users ADD COLUMN assigned_zone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'daily_scan_count') THEN
    ALTER TABLE public.users ADD COLUMN daily_scan_count INTEGER DEFAULT 0;
  END IF;

  -- Kolom shelf_location dan brand pada products
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'shelf_location') THEN
    ALTER TABLE public.products ADD COLUMN shelf_location TEXT DEFAULT 'A-01-01';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand') THEN
    ALTER TABLE public.products ADD COLUMN brand TEXT;
  END IF;
END $$;

-- 5. SEED DATA

-- USERS
INSERT INTO public.users (id, email, username, full_name, role, is_active, assigned_zone, daily_scan_count, avatar_url)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'rizky.firmansyah@stockify.ops', 'rizky.so', 'Rizky Firmansyah', 'staff', true, 'Zona Makanan & Minuman', 420, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000002', 'anita.wijaya@stockify.ops', 'anita.ops', 'Anita Wijaya', 'staff', true, 'Makanan, Minuman & Biskuit', 480, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000003', 'budi.santoso@stockify.ops', 'budi.so', 'Budi Santoso', 'staff', true, 'Snack & Biskuit Kering', 340, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000004', 'siti.maryam@stockify.ops', 'siti.so', 'Siti Maryam', 'staff', true, 'Dairy, Susu & Chiller', 180, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'),
  ('c0000000-0000-0000-0000-000000000005', 'aditya.admin@stockify.ops', 'aditya.admin', 'Aditya R.', 'admin', true, 'Akses Penuh Manajemen', 0, '')
ON CONFLICT (username) DO UPDATE 
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- CATEGORIES
INSERT INTO public.categories (id, name, description)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Makanan Ringan & Biskuit', 'Snack, biskuit, wafer, cokelat, dan permen'),
  ('b0000000-0000-0000-0000-000000000002', 'Minuman & Dairy Chiller', 'Air mineral, susu, teh kemasan, dan jus'),
  ('b0000000-0000-0000-0000-000000000003', 'Sembako & Minyak Goreng', 'Beras, minyak goreng, gula, dan tepung'),
  ('b0000000-0000-0000-0000-000000000004', 'Bumbu Dapur & Saus Kemasan', 'Kecap, saus, kaldu instan, dan garam'),
  ('b0000000-0000-0000-0000-000000000005', 'Perawatan Tubuh & Sabun Mandi', 'Sabun mandi, shampo, dan pasta gigi')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description;

-- PRODUCTS
INSERT INTO public.products (id, barcode, name, category_id, system_stock, shelf_location, brand)
VALUES
  -- Makanan Ringan
  ('a0000000-0000-0000-0000-000000000001', '8992761234801', 'Oreo Vanilla Sandwich 133g', 'b0000000-0000-0000-0000-000000000001', 120, 'B-01-01', 'Mondelez'),
  ('a0000000-0000-0000-0000-000000000002', '8992761234802', 'Roma Biskuit Kelapa 300g', 'b0000000-0000-0000-0000-000000000001', 85, 'B-01-02', 'Mayora'),
  ('a0000000-0000-0000-0000-000000000003', '8992761234803', 'Tango Wafer Cokelat 130g', 'b0000000-0000-0000-0000-000000000001', 150, 'B-02-01', 'OT'),
  ('a0000000-0000-0000-0000-000000000004', '8992761234804', 'Chitato Sapi Panggang 68g', 'b0000000-0000-0000-0000-000000000001', 95, 'B-03-01', 'Indofood'),
  ('a0000000-0000-0000-0000-000000000005', '8992761234805', 'Pocky Chocolate Stick 47g', 'b0000000-0000-0000-0000-000000000001', 110, 'B-03-02', 'Glico'),
  ('a0000000-0000-0000-0000-000000000006', '8992761234806', 'Khong Guan Assorted Biscuits 650g', 'b0000000-0000-0000-0000-000000000001', 40, 'B-04-01', 'Khong Guan'),

  -- Minuman
  ('a0000000-0000-0000-0000-000000000007', '8992761234901', 'Ultra Milk Cokelat 1000ml', 'b0000000-0000-0000-0000-000000000002', 200, 'D-01-01', 'Ultra Jaya'),
  ('a0000000-0000-0000-0000-000000000008', '8992761234902', 'Aqua Air Mineral 600ml', 'b0000000-0000-0000-0000-000000000002', 480, 'D-02-01', 'Danone'),
  ('a0000000-0000-0000-0000-000000000009', '8992761234903', 'Teh Botol Sosro Kotak 250ml', 'b0000000-0000-0000-0000-000000000002', 240, 'D-02-02', 'Sosro'),
  ('a0000000-0000-0000-0000-000000000010', '8992761234904', 'Yakult Minuman Fermentasi 5x65ml', 'b0000000-0000-0000-0000-000000000002', 90, 'D-03-01', 'Yakult'),

  -- Sembako
  ('a0000000-0000-0000-0000-000000000011', '8992761234501', 'Minyak Goreng Sania 2L', 'b0000000-0000-0000-0000-000000000003', 140, 'A-01-01', 'Wilmar'),
  ('a0000000-0000-0000-0000-000000000012', '8992761234502', 'Beras Ramos Super 5kg', 'b0000000-0000-0000-0000-000000000003', 90, 'A-02-01', 'Ramos'),
  ('a0000000-0000-0000-0000-000000000013', '8992761234503', 'Gula Pasir Gulaku Putih 1kg', 'b0000000-0000-0000-0000-000000000003', 210, 'A-03-01', 'Gulaku'),
  ('a0000000-0000-0000-0000-000000000014', '8992761234504', 'Tepung Terigu Segitiga Biru 1kg', 'b0000000-0000-0000-0000-000000000003', 125, 'A-04-01', 'Bogasari')
ON CONFLICT (barcode) DO UPDATE 
SET 
  name = EXCLUDED.name,
  system_stock = EXCLUDED.system_stock,
  shelf_location = EXCLUDED.shelf_location,
  brand = EXCLUDED.brand;

-- ACTIVE SESSIONS
INSERT INTO public.so_sessions (id, session_code, category_id, user_id, status, start_time, total_items, counted_items, notes)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'SO-20261027-0104',
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'active',
    NOW() - INTERVAL '45 minutes',
    6,
    4,
    'Monitoring sesi opname rak display biskuit lorong 4'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'SO-20261027-0208',
    'b0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000004',
    'active',
    NOW() - INTERVAL '25 minutes',
    4,
    2,
    'Sesi opname chiller susu pasteurisasi dan minuman dingin'
  )
ON CONFLICT (session_code) DO NOTHING;

-- SO ITEMS FOR ACTIVE SESSION 1
INSERT INTO public.so_items (session_id, product_id, system_stock, physical_stock, is_counted, counted_at, counted_by)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 120, 120, true, NOW() - INTERVAL '30 minutes', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 85, 83, true, NOW() - INTERVAL '20 minutes', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 150, 153, true, NOW() - INTERVAL '15 minutes', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 95, 95, true, NOW() - INTERVAL '5 minutes', 'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 110, NULL, false, NULL, NULL),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 40, NULL, false, NULL, NULL)
ON CONFLICT DO NOTHING;

-- COMPLETED SESSIONS (FOR RIWAYAT)
INSERT INTO public.so_sessions (id, session_code, category_id, user_id, status, start_time, end_time, total_items, counted_items, notes)
VALUES
  (
    'd0000000-0000-0000-0000-000000000003',
    'SO-2026-CAT01',
    'b0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000002',
    'completed',
    NOW() - INTERVAL '3 days 4 hours',
    NOW() - INTERVAL '3 days 2 hours',
    4,
    4,
    'Audit fisik zona sembako selesai sempurna. Tidak ditemukan selisih barang.'
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'SO-2026-CAT03',
    'b0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000001',
    'completed',
    NOW() - INTERVAL '2 days 5 hours',
    NOW() - INTERVAL '2 days 3 hours',
    4,
    4,
    'Ditemukan selisih 3 pcs pada botol saus dan kecap (kemasan rusak di rak bawah).'
  )
ON CONFLICT (session_code) DO NOTHING;

-- SO ITEMS FOR COMPLETED SESSION 3
INSERT INTO public.so_items (session_id, product_id, system_stock, physical_stock, is_counted, counted_at, counted_by)
VALUES
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000011', 140, 140, true, NOW() - INTERVAL '3 days 3 hours', 'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000012', 90, 90, true, NOW() - INTERVAL '3 days 3 hours', 'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000013', 210, 210, true, NOW() - INTERVAL '3 days 2 hours', 'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000014', 125, 125, true, NOW() - INTERVAL '3 days 2 hours', 'c0000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- AUDIT LOGS
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, before_value, after_value, ip_address, user_agent, timestamp)
VALUES
  (
    'c0000000-0000-0000-0000-000000000005',
    'SESSION_APPROVED',
    'so_sessions',
    'SO-2026-CAT01',
    '{"status": "completed"}'::jsonb,
    '{"status": "completed", "approved_by": "Aditya R."}'::jsonb,
    '192.168.1.105',
    'Stockify Web Console / Chrome 129.0 macOS',
    NOW() - INTERVAL '3 days 1 hour'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'REPORT_EXPORTED',
    'report',
    'SO-2026-CAT01',
    NULL,
    '{"format": "xlsx", "rows": 4, "session_code": "SO-2026-CAT01"}'::jsonb,
    '192.168.1.105',
    'Stockify Web Console / Chrome 129.0 macOS',
    NOW() - INTERVAL '2 days 6 hours'
  ),
  (
    'c0000000-0000-0000-0000-000000000001',
    'ITEM_SCANNED',
    'so_items',
    '8992761234801',
    '{"physical_stock": null, "is_counted": false}'::jsonb,
    '{"physical_stock": 120, "variance": 0, "is_counted": true}'::jsonb,
    '192.168.1.140',
    'Stockify Mobile App v2.4 (Android Zebra TC21)',
    NOW() - INTERVAL '30 minutes'
  ),
  (
    'c0000000-0000-0000-0000-000000000001',
    'ITEM_SCANNED',
    'so_items',
    '8992761234802',
    '{"physical_stock": null, "is_counted": false}'::jsonb,
    '{"physical_stock": 83, "variance": -2, "is_counted": true}'::jsonb,
    '192.168.1.140',
    'Stockify Mobile App v2.4 (Android Zebra TC21)',
    NOW() - INTERVAL '20 minutes'
  );
