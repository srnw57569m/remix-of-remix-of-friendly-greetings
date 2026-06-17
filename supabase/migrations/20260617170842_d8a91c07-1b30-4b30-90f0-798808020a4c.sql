
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS highrise_username text,
  ADD COLUMN IF NOT EXISTS highrise_connected_at timestamptz;

CREATE TABLE IF NOT EXISTS public.highrise_codes (
  code text PRIMARY KEY,
  highrise_username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, UPDATE ON public.highrise_codes TO authenticated;
GRANT ALL ON public.highrise_codes TO service_role;

ALTER TABLE public.highrise_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read codes to claim"
  ON public.highrise_codes FOR SELECT TO authenticated USING (true);
