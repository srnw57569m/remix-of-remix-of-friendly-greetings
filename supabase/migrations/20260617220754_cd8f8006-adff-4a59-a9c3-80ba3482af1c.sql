
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_trials() TO service_role;
