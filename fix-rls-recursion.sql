-- Apply on the live DB. Stops 42P17 on relation "users".
-- Role lookup runs as the function owner and skips RLS, so a policy
-- on users no longer re-enters itself.

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

DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Only admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Only admins can update categories" ON categories;
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
DROP POLICY IF EXISTS "Only admins can update products" ON products;
DROP POLICY IF EXISTS "Sessions are readable by owner or admin" ON so_sessions;
DROP POLICY IF EXISTS "Admins can update any session" ON so_sessions;
DROP POLICY IF EXISTS "Items are readable with session access" ON so_items;
DROP POLICY IF EXISTS "Audit logs are readable by admins" ON audit_logs;

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "Only admins can insert categories" ON categories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Only admins can update categories" ON categories
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Only admins can insert products" ON products
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Only admins can update products" ON products
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Sessions are readable by owner or admin" ON so_sessions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT private.is_admin()));

CREATE POLICY "Admins can update any session" ON so_sessions
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Items are readable with session access" ON so_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM so_sessions
      WHERE id = so_items.session_id
        AND ((SELECT auth.uid()) = user_id OR (SELECT private.is_admin()))
    )
  );

CREATE POLICY "Audit logs are readable by admins" ON audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));
