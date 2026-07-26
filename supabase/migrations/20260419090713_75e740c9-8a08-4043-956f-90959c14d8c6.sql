-- Extend live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS instructor_id UUID,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_seats INTEGER,
  ADD COLUMN IF NOT EXISTS bookings_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS join_window_minutes INTEGER NOT NULL DEFAULT 15;

CREATE INDEX IF NOT EXISTS idx_live_sessions_instructor ON public.live_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON public.live_sessions(scheduled_at);

-- Instructors manage own live sessions
DROP POLICY IF EXISTS "Instructors manage own live sessions" ON public.live_sessions;
CREATE POLICY "Instructors manage own live sessions"
ON public.live_sessions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'instructor'::app_role) AND instructor_id = auth.uid());

-- Bookings table
CREATE TABLE IF NOT EXISTS public.live_session_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  joined_at TIMESTAMPTZ,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lsb_user ON public.live_session_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_lsb_session ON public.live_session_bookings(session_id);

ALTER TABLE public.live_session_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own bookings" ON public.live_session_bookings;
CREATE POLICY "Users view own bookings" ON public.live_session_bookings
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own bookings" ON public.live_session_bookings;
CREATE POLICY "Users insert own bookings" ON public.live_session_bookings
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own bookings" ON public.live_session_bookings;
CREATE POLICY "Users update own bookings" ON public.live_session_bookings
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own bookings" ON public.live_session_bookings;
CREATE POLICY "Users delete own bookings" ON public.live_session_bookings
FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage all bookings" ON public.live_session_bookings;
CREATE POLICY "Admins manage all bookings" ON public.live_session_bookings
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Instructors view own session bookings" ON public.live_session_bookings;
CREATE POLICY "Instructors view own session bookings" ON public.live_session_bookings
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.id = live_session_bookings.session_id
      AND ls.instructor_id = auth.uid()
      AND has_role(auth.uid(), 'instructor'::app_role)
  )
);

-- Bookings count trigger
CREATE OR REPLACE FUNCTION public.update_session_bookings_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session UUID;
BEGIN
  v_session := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE public.live_sessions
  SET bookings_count = (SELECT COUNT(*) FROM public.live_session_bookings WHERE session_id = v_session AND status = 'confirmed'),
      updated_at = now()
  WHERE id = v_session;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_update_session_bookings_count ON public.live_session_bookings;
CREATE TRIGGER trg_update_session_bookings_count
AFTER INSERT OR UPDATE OR DELETE ON public.live_session_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_session_bookings_count();

DROP TRIGGER IF EXISTS trg_lsb_updated_at ON public.live_session_bookings;
CREATE TRIGGER trg_lsb_updated_at
BEFORE UPDATE ON public.live_session_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admin on new booking
CREATE OR REPLACE FUNCTION public.notify_new_live_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session_title TEXT; v_user_name TEXT;
BEGIN
  IF NEW.status <> 'confirmed' THEN RETURN NEW; END IF;
  SELECT title INTO v_session_title FROM public.live_sessions WHERE id = NEW.session_id;
  SELECT COALESCE(NULLIF(full_name,''),'طالب') INTO v_user_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.admin_notifications (type, title, message, link, metadata)
  VALUES (
    'live_booking', 'حجز جديد لحصة مباشرة',
    v_user_name || ' حجز حصة "' || COALESCE(v_session_title,'غير معروف') || '"',
    '/admin/live',
    jsonb_build_object('session_id', NEW.session_id, 'user_id', NEW.user_id)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_live_booking ON public.live_session_bookings;
CREATE TRIGGER trg_notify_new_live_booking
AFTER INSERT ON public.live_session_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_new_live_booking();