
-- 1. Tighten highrise_codes SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read codes to claim" ON public.highrise_codes;
CREATE POLICY "Users can read own claimed codes"
  ON public.highrise_codes FOR SELECT TO authenticated
  USING (claimed_by = auth.uid());

-- 2. Revoke execute on trigger function from public roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3. Trigger to block non-admins from changing sensitive bot columns
CREATE OR REPLACE FUNCTION public.protect_bot_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service role and admins to change anything
  IF auth.uid() IS NULL OR private.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
     OR NEW.plan_duration IS DISTINCT FROM OLD.plan_duration THEN
    RAISE EXCEPTION 'Not allowed to modify subscription or ownership fields';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_bot_sensitive_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_bot_sensitive_columns ON public.bots;
CREATE TRIGGER protect_bot_sensitive_columns
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.protect_bot_sensitive_columns();

-- 4. Storage policies for bot-templates bucket
DROP POLICY IF EXISTS "bot-templates admin read" ON storage.objects;
DROP POLICY IF EXISTS "bot-templates admin write" ON storage.objects;
DROP POLICY IF EXISTS "bot-templates admin update" ON storage.objects;
DROP POLICY IF EXISTS "bot-templates admin delete" ON storage.objects;
DROP POLICY IF EXISTS "bot-templates authenticated read" ON storage.objects;

CREATE POLICY "bot-templates authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bot-templates');

CREATE POLICY "bot-templates admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bot-templates' AND private.is_admin(auth.uid()));

CREATE POLICY "bot-templates admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bot-templates' AND private.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'bot-templates' AND private.is_admin(auth.uid()));

CREATE POLICY "bot-templates admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bot-templates' AND private.is_admin(auth.uid()));
