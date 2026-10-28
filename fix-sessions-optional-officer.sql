-- ============================================================
-- REVISI SCHEMA: PETUGAS OPSIONAL PADA SESI STOCK OPNAME
-- Jalankan skrip ini di SQL Editor Supabase Anda
-- ============================================================

-- 1. Hapus batasan NOT NULL pada kolom user_id di tabel so_sessions
ALTER TABLE public.so_sessions ALTER COLUMN user_id DROP NOT NULL;

-- 2. Pastikan foreign key constraint mengizinkan NULL dan ON DELETE SET NULL
ALTER TABLE public.so_sessions DROP CONSTRAINT IF EXISTS so_sessions_user_id_fkey;
ALTER TABLE public.so_sessions ADD CONSTRAINT so_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Verifikasi struktur kolom
COMMENT ON COLUMN public.so_sessions.user_id IS 'Petugas penanggung jawab sesi SO (opsional/nullable). Jika NULL, sesi bersifat terbuka untuk semua petugas.';
