
CREATE TABLE IF NOT EXISTS public.plan_prices (
  duration text PRIMARY KEY,
  label text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  interval_sql text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.plan_prices TO anon, authenticated;
GRANT ALL ON public.plan_prices TO service_role;

ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan prices"
  ON public.plan_prices FOR SELECT
  USING (true);

CREATE POLICY "Admins can update plan prices"
  ON public.plan_prices FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

INSERT INTO public.plan_prices (duration, label, price, interval_sql, sort_order) VALUES
  ('hourly',  '1 Hour',  50,    '1 hour',  1),
  ('daily',   '1 Day',   500,   '1 day',   2),
  ('weekly',  '1 Week',  2500,  '7 days',  3),
  ('monthly', '1 Month', 8000,  '30 days', 4),
  ('yearly',  '1 Year',  80000, '365 days',5)
ON CONFLICT (duration) DO NOTHING;
