
-- 1) Wallet balance on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance integer NOT NULL DEFAULT 0;

-- 2) Plan duration on bots (existing subscription_status / _expires_at reused)
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS plan_duration text;

-- 3) Wallet transactions ledger
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,              -- 'deposit' | 'purchase' | 'refund' | 'adjustment'
  amount integer NOT NULL,         -- positive = credit, negative = debit
  balance_after integer NOT NULL,
  reference text,                  -- highrise_id, bot_id, etc.
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their wallet history"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS wallet_tx_user_idx ON public.wallet_transactions(user_id, created_at DESC);

-- 4) Atomic deposit: credit a profile by highrise_id, append ledger row
CREATE OR REPLACE FUNCTION public.bank_deposit_by_highrise(
  _highrise_id text,
  _username text,
  _amount integer
)
RETURNS TABLE(user_id uuid, balance_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_balance integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT id INTO v_user FROM public.profiles
   WHERE highrise_id = _highrise_id
   LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'no profile linked to highrise_id %', _highrise_id;
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance + _amount,
         updated_at = now()
   WHERE id = v_user
   RETURNING wallet_balance INTO v_balance;

  INSERT INTO public.wallet_transactions(user_id, kind, amount, balance_after, reference, detail)
  VALUES (v_user, 'deposit', _amount, v_balance, _highrise_id, 'highrise tip from @' || COALESCE(_username, '?'));

  RETURN QUERY SELECT v_user, v_balance;
END;
$$;

-- 5) Atomic plan purchase: debit wallet, activate bot, set expiry
CREATE OR REPLACE FUNCTION public.purchase_bot_plan(
  _user_id uuid,
  _bot_id uuid,
  _duration text,
  _price integer,
  _interval interval
)
RETURNS TABLE(bot_id uuid, expires_at timestamptz, balance_after integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_expires timestamptz;
  v_owns boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.bots WHERE id = _bot_id AND user_id = _user_id) INTO v_owns;
  IF NOT v_owns THEN
    RAISE EXCEPTION 'bot not found';
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < _price THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance - _price,
         updated_at = now()
   WHERE id = _user_id
   RETURNING wallet_balance INTO v_balance;

  -- extend from current expiry if still active, otherwise from now
  SELECT GREATEST(COALESCE(subscription_expires_at, now()), now()) + _interval
    INTO v_expires
    FROM public.bots WHERE id = _bot_id;

  UPDATE public.bots
     SET subscription_status = 'Active',
         plan_duration = _duration,
         subscription_expires_at = v_expires,
         updated_at = now()
   WHERE id = _bot_id;

  INSERT INTO public.wallet_transactions(user_id, kind, amount, balance_after, reference, detail)
  VALUES (_user_id, 'purchase', -_price, v_balance, _bot_id::text, 'plan ' || _duration);

  RETURN QUERY SELECT _bot_id, v_expires, v_balance;
END;
$$;
