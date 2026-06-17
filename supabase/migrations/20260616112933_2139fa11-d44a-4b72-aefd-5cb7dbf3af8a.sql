
CREATE TABLE public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_name text NOT NULL,
  bot_index integer NOT NULL,
  bot_token text NOT NULL,
  room_id text NOT NULL,
  owner_username text NOT NULL,
  icecast_server text NOT NULL,
  icecast_port integer NOT NULL,
  mount_point text NOT NULL,
  icecast_username text NOT NULL,
  icecast_password text NOT NULL,
  status text NOT NULL DEFAULT 'Created',
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bot_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT ALL ON public.bots TO service_role;

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bots" ON public.bots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bots" ON public.bots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bots" ON public.bots
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bots" ON public.bots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS for user-bots bucket: owner-only access via path prefix
CREATE POLICY "Users can read own bot files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-bots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can write own bot files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-bots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own bot files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-bots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own bot files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-bots' AND auth.uid()::text = (storage.foldername(name))[1]);
