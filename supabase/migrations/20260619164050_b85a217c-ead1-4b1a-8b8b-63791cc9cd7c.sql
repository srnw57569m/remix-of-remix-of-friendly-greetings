ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS admin_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_suspended_reason text,
  ADD COLUMN IF NOT EXISTS admin_suspended_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_bot_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
     OR NEW.plan_duration IS DISTINCT FROM OLD.plan_duration
     OR NEW.admin_suspended IS DISTINCT FROM OLD.admin_suspended
     OR NEW.admin_suspended_reason IS DISTINCT FROM OLD.admin_suspended_reason
     OR NEW.admin_suspended_at IS DISTINCT FROM OLD.admin_suspended_at THEN
    RAISE EXCEPTION 'Not allowed to modify subscription, ownership, or suspension fields';
  END IF;
  RETURN NEW;
END;
$function$;