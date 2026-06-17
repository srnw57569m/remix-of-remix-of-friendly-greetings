
-- Attach trigger so new auth users get a profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, user_id, username, email)
SELECT u.id, u.id,
       COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
       u.email
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
 WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Make start_free_trial self-heal: create profile if missing, treat NULL as not-used
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
  v_email text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Ensure profile row exists
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  INSERT INTO public.profiles (id, user_id, username, email)
  VALUES (_user_id, _user_id, split_part(COALESCE(v_email, ''), '@', 1), v_email)
  ON CONFLICT (id) DO NOTHING;

  SELECT COALESCE(free_trial_used, false) INTO v_used
    FROM public.profiles WHERE id = _user_id FOR UPDATE;

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
