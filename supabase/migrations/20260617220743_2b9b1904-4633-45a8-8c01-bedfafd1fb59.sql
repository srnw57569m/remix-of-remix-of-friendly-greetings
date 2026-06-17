
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_trial_used boolean NOT NULL DEFAULT false;

-- Allow 'trial' value in subscription_status / plan_duration (these are free-form text columns; no constraint to relax)

CREATE OR REPLACE FUNCTION public.start_free_trial(_bot_id uuid)
RETURNS TABLE(bot_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_used boolean;
  v_owns boolean;
  v_expires timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT free_trial_used INTO v_used FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_used IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF v_used THEN
    RAISE EXCEPTION 'free trial already used';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.bots WHERE id = _bot_id AND user_id = v_user) INTO v_owns;
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
   WHERE id = v_user;

  INSERT INTO public.activity_logs(user_id, bot_id, action, detail)
  VALUES (v_user, _bot_id, 'trial_started', '24h free trial activated');

  RETURN QUERY SELECT _bot_id, v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_bot_time(_bot_id uuid, _hours integer)
RETURNS TABLE(bot_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean;
  v_expires timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _hours IS NULL OR _hours <= 0 OR _hours > 24 * 365 * 5 THEN
    RAISE EXCEPTION 'hours must be between 1 and %', 24*365*5;
  END IF;

  SELECT private.is_admin(v_caller) INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT GREATEST(COALESCE(subscription_expires_at, now()), now()) + make_interval(hours => _hours)
    INTO v_expires
    FROM public.bots WHERE id = _bot_id;

  IF v_expires IS NULL THEN
    RAISE EXCEPTION 'bot not found';
  END IF;

  UPDATE public.bots
     SET subscription_status = 'Active',
         plan_duration = COALESCE(plan_duration, 'admin'),
         subscription_expires_at = v_expires,
         updated_at = now()
   WHERE id = _bot_id;

  INSERT INTO public.activity_logs(user_id, bot_id, action, detail)
  VALUES (v_caller, _bot_id, 'admin_grant_time', _hours || ' hours');

  RETURN QUERY SELECT _bot_id, v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM public.bots
     WHERE plan_duration = 'trial'
       AND subscription_expires_at IS NOT NULL
       AND subscription_expires_at < now()
     RETURNING id
  )
  SELECT count(*) INTO v_count FROM deleted;
  RETURN v_count;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-trials');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-expired-trials',
  '*/15 * * * *',
  $$SELECT public.cleanup_expired_trials();$$
);
