-- dash_0017 — close the EXECUTE hole on the three *_bump_usage functions.
--
-- dash_0001 / dash_0009 / dash_0013 each end with
--   revoke all on function ... from public;
--   grant execute on function ... to service_role;
-- intending service-role-only execution (the edge functions call them with the
-- service key, passing the JWT-verified user id). That never took effect: this
-- project's default privileges for role postgres in schema public
-- (pg_default_acl) grant EXECUTE on every new function to anon, authenticated
-- and service_role EXPLICITLY. `revoke ... from public` removes only the PUBLIC
-- pseudo-role grant, so anon:EXECUTE and authenticated:EXECUTE survived.
-- Supabase advisors anon_security_definer_function_executable and
-- authenticated_security_definer_function_executable (WARN) flagged all three.
--
-- Measured 2026-09-08 before this migration: `set role anon` could call
-- casting_bump_usage(<uuid>, 5); the call reached the INSERT (an FK violation
-- named the missing user). So anyone holding the anon key could increment or
-- exhaust any user's daily cap, and probe which user ids exist.
--
-- Callers verified: supabase/functions/{casting,channel-guideline,character}-proxy
-- all call admin.rpc(...) with SUPABASE_SERVICE_ROLE_KEY. Nothing calls these
-- with the anon key or a user JWT, so revoking from anon/authenticated changes
-- no caller. service_role keeps EXECUTE.
--
-- Not changed here (policy call, flagged to the operator): the default
-- privileges themselves. Altering them would affect every future function in
-- public, including RPCs meant for the dashboard client.

revoke execute on function public.casting_bump_usage(uuid, int)           from public, anon, authenticated;
revoke execute on function public.channel_guideline_bump_usage(uuid, int) from public, anon, authenticated;
revoke execute on function public.character_bump_usage(uuid, int)         from public, anon, authenticated;

grant execute on function public.casting_bump_usage(uuid, int)           to service_role;
grant execute on function public.channel_guideline_bump_usage(uuid, int) to service_role;
grant execute on function public.character_bump_usage(uuid, int)         to service_role;
