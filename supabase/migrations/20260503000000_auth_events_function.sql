-- Expose a controlled view of auth.audit_log_entries to the API.
--
-- Supabase only exposes the `public` and `graphql_public` schemas to PostgREST
-- by default; the `auth` schema is internal. We need to read it from the
-- /api/admin/email-trace endpoint to merge login / magic-link / password-reset
-- events into the per-user activity timeline. Adding `auth` to the exposed
-- schemas would be a much bigger blast radius than necessary.
--
-- SECURITY DEFINER + REVOKE PUBLIC + GRANT service_role gives us a narrow
-- read-only door: only callers with the service-role key can invoke this, and
-- only this specific shape of data. The application enforces super_admin
-- authorization in the API route before calling it.

CREATE OR REPLACE FUNCTION public.get_user_auth_events(p_actor_username text)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  ip_address varchar,
  payload jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id, created_at, ip_address, payload
  FROM auth.audit_log_entries
  WHERE
    payload->>'actor_username' = p_actor_username
    OR payload->'traits'->>'user_email' = p_actor_username
  ORDER BY created_at DESC
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.get_user_auth_events(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_auth_events(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_user_auth_events(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_auth_events(text) TO service_role;

COMMENT ON FUNCTION public.get_user_auth_events(text) IS
  'Returns up to 500 most recent auth.audit_log_entries rows for a given actor_username (typically email). service_role only — the API enforces super_admin gating.';
