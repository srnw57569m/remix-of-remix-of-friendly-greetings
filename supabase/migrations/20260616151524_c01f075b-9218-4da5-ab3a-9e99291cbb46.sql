-- 1) Extend bots table
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS admins jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'Disabled',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_restart_at timestamptz;

-- Keep updated_at fresh on bots
DROP TRIGGER IF EXISTS update_bots_updated_at ON public.bots;
CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bot_id uuid REFERENCES public.bots(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_logs;
CREATE POLICY "Users can view own activity"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_logs;
CREATE POLICY "Users can insert own activity"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activity_logs_user_bot_created_idx
  ON public.activity_logs (user_id, bot_id, created_at DESC);