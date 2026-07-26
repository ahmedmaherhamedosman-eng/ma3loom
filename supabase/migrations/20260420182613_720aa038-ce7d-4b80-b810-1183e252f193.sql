-- Allow payments to be linked to live sessions (not just courses)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS live_session_id uuid REFERENCES public.live_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.payments ALTER COLUMN course_id DROP NOT NULL;

-- Ensure exactly one of course_id or live_session_id is set
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_target_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_target_check
  CHECK ((course_id IS NOT NULL)::int + (live_session_id IS NOT NULL)::int = 1);

-- Link bookings to payments more clearly + prevent duplicate confirmed bookings
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking
  ON public.live_session_bookings(user_id, session_id)
  WHERE status = 'confirmed';

-- Trigger to enforce max_seats at insert/update time (no overbooking races)
CREATE OR REPLACE FUNCTION public.check_live_session_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INT;
  v_count INT;
BEGIN
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;
  SELECT max_seats INTO v_max FROM public.live_sessions WHERE id = NEW.session_id;
  IF v_max IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM public.live_session_bookings
    WHERE session_id = NEW.session_id AND status = 'confirmed' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'live_session_full';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_live_session_capacity ON public.live_session_bookings;
CREATE TRIGGER trg_check_live_session_capacity
  BEFORE INSERT OR UPDATE ON public.live_session_bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_live_session_capacity();