-- ============================================================
-- FIX RLS & USER PERMISSIONS UNTUK STOCK OPNAME
-- Jalankan skrip ini di SQL Editor Supabase Anda
-- ============================================================

-- 1. Bersihkan data user lama yang email-nya sama tapi beda ID dari auth.users
DELETE FROM public.users 
WHERE email IN (SELECT email FROM auth.users)
  AND id NOT IN (SELECT id FROM auth.users);

-- 2. Sinkronkan semua akun dari auth.users ke public.users dengan role 'admin'
INSERT INTO public.users (id, email, username, full_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'full_name', 'Administrator'),
  'admin',
  true
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', is_active = true;

-- 3. Buat trigger otomatis agar setiap user baru di Supabase Auth otomatis tercatat di public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrator'),
    'admin',
    true
  )
  ON CONFLICT (id) DO UPDATE 
  SET role = 'admin', is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Buka akses RLS tabel products untuk user yang terautentikasi (authenticated)
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
CREATE POLICY "Allow authenticated insert products" ON products
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update products" ON products;
CREATE POLICY "Allow authenticated update products" ON products
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can delete products" ON products;
CREATE POLICY "Allow authenticated delete products" ON products
  FOR DELETE TO authenticated
  USING (true);

-- 5. Buka akses RLS tabel categories untuk user yang terautentikasi (authenticated)
DROP POLICY IF EXISTS "Only admins can insert categories" ON categories;
CREATE POLICY "Allow authenticated insert categories" ON categories
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update categories" ON categories;
CREATE POLICY "Allow authenticated update categories" ON categories
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
