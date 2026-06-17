ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS highrise_id text;
ALTER TABLE public.highrise_codes ADD COLUMN IF NOT EXISTS highrise_id text;
CREATE INDEX IF NOT EXISTS profiles_highrise_id_idx ON public.profiles(highrise_id);