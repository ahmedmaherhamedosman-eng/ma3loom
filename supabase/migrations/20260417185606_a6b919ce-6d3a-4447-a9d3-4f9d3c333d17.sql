-- Replace Paddle columns with Stripe columns in courses
ALTER TABLE public.courses 
  DROP COLUMN IF EXISTS paddle_price_id,
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Replace Paddle columns with Stripe columns in payments
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS paddle_transaction_id,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Update default provider
ALTER TABLE public.payments
  ALTER COLUMN payment_provider SET DEFAULT 'stripe';

-- Update any existing rows (wipe old paddle data since they answered "delete all")
UPDATE public.payments SET payment_provider = 'stripe' WHERE payment_provider = 'paddle';

-- Index for fast lookup on webhook
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON public.payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_courses_stripe_price ON public.courses(stripe_price_id);