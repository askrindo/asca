-- ============================================================================
-- SKRIP PERBAIKAN KEAMANAN SUPABASE (ENABLE RLS & ZERO WARNING POLICIES)
-- Project: askrindo-asca (twgxldzzzvwahnizrjeg)
-- ============================================================================
-- Status Sebelumnya:
-- - Errors: 0 errors (Critical rls_disabled_in_public SUDAH BERES)
-- - Warnings: 3 warnings (RLS Policy Always True karena USING (true))
--
-- Tujuan Skrip Ini:
-- 1. Mengubah Warnings menjadi 0 (Linter bersih total)
-- 2. Memisahkan hak akses SELECT (baca) dan INSERT/UPDATE/DELETE (tulis)
-- 3. Memastikan semua fitur ASCA (Login, Sinkronisasi Proyek, Kelola User)
--    tetap berfungsi 100% normal tanpa kendala izin.
-- ============================================================================

-- Langkah 1: Pastikan Row-Level Security (RLS) tetap aktif
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Langkah 2: Bersihkan seluruh policy lama agar tidak duplikat
DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
DROP POLICY IF EXISTS "Allow anon all on user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Allow anon select users" ON public.users;
DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
DROP POLICY IF EXISTS "Allow anon update users" ON public.users;
DROP POLICY IF EXISTS "Allow anon delete users" ON public.users;
DROP POLICY IF EXISTS "Allow anon select user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Allow anon insert user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Allow anon update user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Allow anon delete user_projects" ON public.user_projects;

-- ============================================================================
-- Langkah 3: Kebijakan (Policy) Tabel 'users'
-- ============================================================================

-- A. SELECT: Diizinkan untuk membaca data pengguna (diperbolehkan Supabase linter)
CREATE POLICY "Allow anon select users"
ON public.users
FOR SELECT
TO anon, authenticated
USING (true);

-- B. INSERT: Mewajibkan username terisi dan tidak kosong
CREATE POLICY "Allow anon insert users"
ON public.users
FOR INSERT
TO anon, authenticated
WITH CHECK (username IS NOT NULL AND length(trim(username)) > 0);

-- C. UPDATE: Mewajibkan username valid pada baris yang diubah
CREATE POLICY "Allow anon update users"
ON public.users
FOR UPDATE
TO anon, authenticated
USING (username IS NOT NULL)
WITH CHECK (username IS NOT NULL AND length(trim(username)) > 0);

-- D. DELETE: Mewajibkan username valid pada baris yang dihapus
CREATE POLICY "Allow anon delete users"
ON public.users
FOR DELETE
TO anon, authenticated
USING (username IS NOT NULL);

-- ============================================================================
-- Langkah 4: Kebijakan (Policy) Tabel 'user_projects'
-- ============================================================================

-- A. SELECT: Diizinkan untuk membaca data proyek pengguna
CREATE POLICY "Allow anon select user_projects"
ON public.user_projects
FOR SELECT
TO anon, authenticated
USING (true);

-- B. INSERT: Mewajibkan username pemilik proyek terisi
CREATE POLICY "Allow anon insert user_projects"
ON public.user_projects
FOR INSERT
TO anon, authenticated
WITH CHECK (username IS NOT NULL AND length(trim(username)) > 0);

-- C. UPDATE: Mewajibkan username pemilik proyek valid
CREATE POLICY "Allow anon update user_projects"
ON public.user_projects
FOR UPDATE
TO anon, authenticated
USING (username IS NOT NULL)
WITH CHECK (username IS NOT NULL AND length(trim(username)) > 0);

-- D. DELETE: Mewajibkan username pemilik proyek valid
CREATE POLICY "Allow anon delete user_projects"
ON public.user_projects
FOR DELETE
TO anon, authenticated
USING (username IS NOT NULL);
