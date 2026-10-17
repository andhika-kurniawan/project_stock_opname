-- TEMPORARY: Disable RLS for testing (ONLY FOR DEVELOPMENT)
-- DO NOT USE IN PRODUCTION

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Note: This allows anonymous read access
-- After testing, re-enable RLS and create proper policies
