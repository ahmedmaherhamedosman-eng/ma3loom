
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'SAR';
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'SAR';
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'SAR';
ALTER TABLE public.book_purchases ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'SAR';
ALTER TABLE public.book_purchases ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.book_purchases ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
CREATE INDEX IF NOT EXISTS idx_book_purchases_stripe_session ON public.book_purchases(stripe_session_id);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_target_check;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS book_id UUID REFERENCES public.books(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD CONSTRAINT payments_target_check
  CHECK (((course_id IS NOT NULL)::int + (live_session_id IS NOT NULL)::int + (book_id IS NOT NULL)::int) = 1);
