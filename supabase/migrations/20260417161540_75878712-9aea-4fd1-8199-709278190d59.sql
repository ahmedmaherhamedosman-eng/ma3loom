
-- 1. Add Paddle columns to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS paddle_price_id text,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

-- Mark existing free courses
UPDATE public.courses SET is_free = true WHERE price = 0;

-- 2. Add Paddle transaction id to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paddle_transaction_id text UNIQUE;

-- Update default currency for new payments
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE public.payments ALTER COLUMN payment_provider SET DEFAULT 'paddle';

-- 3. Tighten enrollment policy: users can only self-enroll in FREE courses
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;

CREATE POLICY "Users can enroll themselves in free courses"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = enrollments.course_id
      AND courses.is_free = true
  )
);

-- 4. Enable realtime on key tables
ALTER TABLE public.enrollments REPLICA IDENTITY FULL;
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'enrollments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'courses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;
