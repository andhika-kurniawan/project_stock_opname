-- ============================================================
-- FIX RLS & SEED DATA UNTUK MANAJEMEN PETUGAS & AUDIT LOGS
-- Jalankan skrip ini di SQL Editor Supabase Anda
-- ============================================================

-- 1. Berikan hak akses RLS penuh untuk tabel users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated view users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated insert users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated update users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated delete users" ON public.users;

-- Buka akses SELECT, INSERT, UPDATE, DELETE untuk authenticated & anon (development)
CREATE POLICY "Allow all select users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update users" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete users" ON public.users
  FOR DELETE USING (true);

-- 2. Berikan hak akses RLS penuh untuk tabel audit_logs
DROP POLICY IF EXISTS "Audit logs are readable by admins" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all select audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all insert audit_logs" ON public.audit_logs;

CREATE POLICY "Allow all select audit_logs" ON public.audit_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- 3. Berikan hak akses RLS penuh untuk tabel so_sessions
DROP POLICY IF EXISTS "Sessions are readable by owner or admin" ON public.so_sessions;
DROP POLICY IF EXISTS "Admins can update any session" ON public.so_sessions;
DROP POLICY IF EXISTS "Allow all select so_sessions" ON public.so_sessions;
DROP POLICY IF EXISTS "Allow all insert so_sessions" ON public.so_sessions;
DROP POLICY IF EXISTS "Allow all update so_sessions" ON public.so_sessions;

CREATE POLICY "Allow all select so_sessions" ON public.so_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert so_sessions" ON public.so_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update so_sessions" ON public.so_sessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Tambahkan kolom avatar_url, assigned_zone, dan daily_scan_count jika belum ada pada tabel users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'assigned_zone') THEN
    ALTER TABLE public.users ADD COLUMN assigned_zone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'daily_scan_count') THEN
    ALTER TABLE public.users ADD COLUMN daily_scan_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 5. Tambahkan kolom category_rack dan status pada audit_logs jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'category_rack') THEN
    ALTER TABLE public.audit_logs ADD COLUMN category_rack TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'status') THEN
    ALTER TABLE public.audit_logs ADD COLUMN status TEXT DEFAULT 'Sukses';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'officer_name') THEN
    ALTER TABLE public.audit_logs ADD COLUMN officer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'officer_avatar') THEN
    ALTER TABLE public.audit_logs ADD COLUMN officer_avatar TEXT;
  END IF;
END $$;

-- 6. Insert data awal Manajemen Petugas sesuai gambar referensi (Idempotent)
INSERT INTO public.users (email, username, full_name, role, is_active, assigned_zone, daily_scan_count, avatar_url)
VALUES 
  ('rizky.firmansyah@stockify.ops', 'rizky.so', 'Rizky Firmansyah', 'staff', true, 'Zona Makanan & Minuman', 420, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
  ('anita.wijaya@stockify.ops', 'anita.ops', 'Anita Wijaya', 'staff', true, 'Makanan, Minuman & Biskuit', 480, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'),
  ('budi.santoso@stockify.ops', 'budi.so', 'Budi Santoso', 'staff', true, 'Snack & Biskuit Kering', 340, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
  ('siti.maryam@stockify.ops', 'siti.so', 'Siti Maryam', 'staff', true, 'Dairy, Susu & Chiller', 180, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'),
  ('aditya.admin@stockify.ops', 'aditya.admin', 'Aditya R.', 'admin', true, 'Akses Penuh Manajemen', 0, '')
ON CONFLICT (username) DO UPDATE 
SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  assigned_zone = EXCLUDED.assigned_zone,
  daily_scan_count = EXCLUDED.daily_scan_count,
  avatar_url = EXCLUDED.avatar_url;

-- 7. Insert data awal Log Aktivitas Terbaru sesuai gambar referensi
INSERT INTO public.audit_logs (action, category_rack, status, officer_name, officer_avatar, timestamp, entity_type)
VALUES
  ('Mulai Sesi Pemindaian', 'Dairy & Chiller', 'Sukses', 'Siti Maryam', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', CURRENT_DATE + TIME '09:05:00', 'SESSION'),
  ('Mulai Sesi Pemindaian', 'Snack & Biskuit Kering', 'Sukses', 'Budi Santoso', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', CURRENT_DATE + TIME '08:35:00', 'SESSION'),
  ('Login Autentikasi', 'Dashboard Utama', 'Sukses', 'Anita Wijaya', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', CURRENT_DATE + TIME '08:20:00', 'AUTH'),
  ('Mulai Sesi Pemindaian', 'Makanan & Minuman', 'Sukses', 'Rizky Firmansyah', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', CURRENT_DATE + TIME '08:15:00', 'SESSION'),
  ('Buka Batch SO', 'BATCH-SO-FEB26', 'Sukses', 'Aditya R.', '', CURRENT_DATE + TIME '07:55:00', 'BATCH');
