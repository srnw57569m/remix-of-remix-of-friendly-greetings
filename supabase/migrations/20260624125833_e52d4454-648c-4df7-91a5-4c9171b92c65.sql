
-- Add bot_type discriminator + moderation-specific fields
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS bot_type text NOT NULL DEFAULT 'music',
  ADD COLUMN IF NOT EXISTS welcome_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bye_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bots_bot_type_check') THEN
    ALTER TABLE public.bots ADD CONSTRAINT bots_bot_type_check CHECK (bot_type IN ('music','moderation'));
  END IF;
END $$;

-- Make icecast columns nullable for moderation rows
ALTER TABLE public.bots
  ALTER COLUMN icecast_server DROP NOT NULL,
  ALTER COLUMN icecast_port DROP NOT NULL,
  ALTER COLUMN mount_point DROP NOT NULL,
  ALTER COLUMN icecast_username DROP NOT NULL,
  ALTER COLUMN icecast_password DROP NOT NULL;

-- Update protect trigger to also lock bot_type
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
     OR NEW.bot_type IS DISTINCT FROM OLD.bot_type
     OR NEW.admin_suspended IS DISTINCT FROM OLD.admin_suspended
     OR NEW.admin_suspended_reason IS DISTINCT FROM OLD.admin_suspended_reason
     OR NEW.admin_suspended_at IS DISTINCT FROM OLD.admin_suspended_at THEN
    RAISE EXCEPTION 'Not allowed to modify subscription, ownership, type, or suspension fields';
  END IF;
  RETURN NEW;
END;
$function$;

-- plan_prices: add bot_type, repoint PK to (bot_type, duration), seed moderation rows
ALTER TABLE public.plan_prices
  ADD COLUMN IF NOT EXISTS bot_type text NOT NULL DEFAULT 'music';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_prices_bot_type_check') THEN
    ALTER TABLE public.plan_prices ADD CONSTRAINT plan_prices_bot_type_check CHECK (bot_type IN ('music','moderation'));
  END IF;
END $$;

ALTER TABLE public.plan_prices DROP CONSTRAINT IF EXISTS plan_prices_pkey;
ALTER TABLE public.plan_prices ADD PRIMARY KEY (bot_type, duration);

-- Seed moderation rows mirroring music prices (idempotent)
INSERT INTO public.plan_prices (bot_type, duration, label, price, interval_sql, sort_order)
SELECT 'moderation', duration, label, price, interval_sql, sort_order
FROM public.plan_prices
WHERE bot_type = 'music'
ON CONFLICT (bot_type, duration) DO NOTHING;
