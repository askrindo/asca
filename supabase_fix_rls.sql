-- ============================================================================
-- SKRIP PERBAIKAN KEAMANAN SUPABASE (ENABLE RLS & SECURITY POLICIES)
-- Project: askrindo-asca (twgxldzzzvwahnizrjeg)
-- Solusi untuk Peringatan Email Supabase:
-- 1. Table publicly accessible (rls_disabled_in_public)
-- 2. Sensitive data publicly accessible (sensitive_columns_exposed)
-- ============================================================================

-- Langkah 1: Aktifkan Row-Level Security (RLS) pada seluruh tabel publik
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Langkah 2: Bersihkan policy lama (jika ada) agar tidak konflik / duplikat
DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
DROP POLICY IF EXISTS "Allow anon all on user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update for all users" ON public.users;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Enable insert for all user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Enable update for all user_projects" ON public.user_projects;
DROP POLICY IF EXISTS "Enable delete for all user_projects" ON public.user_projects;

-- Langkah 3: Buat Security Policy untuk akses aplikasi ASCA (role anon & authenticated)

-- A. Policy untuk tabel 'users'
CREATE POLICY "Allow anon all on users"
ON public.users
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- B. Policy untuk tabel 'user_projects'
CREATE POLICY "Allow anon all on user_projects"
ON public.user_projects
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
