
DROP FUNCTION IF EXISTS public.start_free_trial(uuid);

CREATE OR REPLACE FUNCTION public.start_free_trial(_user_id uuid, _bot_id uuid)
 RETURNS TABLE(bot_id uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_used boolean;
  v_owns boolean;
  v_expires timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT free_trial_used INTO v_used FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF v_used IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF v_used THEN
    RAISE EXCEPTION 'free trial already used';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.bots WHERE id = _bot_id AND user_id = _user_id) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'bot not found';
  END IF;

  v_expires := now() + interval '24 hours';

  UPDATE public.bots
     SET subscription_status = 'Active',
         plan_duration = 'trial',
         subscription_expires_at = v_expires,
         updated_at = now()
   WHERE id = _bot_id;

  UPDATE public.profiles
     SET free_trial_used = true,
         updated_at = now()
   WHERE id = _user_id;

  INSERT INTO public.activity_logs(user_id, bot_id, action, detail)
  VALUES (_user_id, _bot_id, 'trial_started', '24h free trial activated');

  RETURN QUERY SELECT _bot_id, v_expires;
END;
$function$;
