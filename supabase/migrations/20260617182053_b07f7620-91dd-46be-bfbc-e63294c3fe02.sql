
REVOKE ALL ON FUNCTION public.bank_deposit_by_highrise(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_bot_plan(uuid, uuid, text, integer, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bank_deposit_by_highrise(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_bot_plan(uuid, uuid, text, integer, interval) TO service_role;
