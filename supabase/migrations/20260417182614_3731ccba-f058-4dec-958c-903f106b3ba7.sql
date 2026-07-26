-- Admin notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications(is_read) WHERE is_read = false;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete notifications"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: notify on new student profile
CREATE OR REPLACE FUNCTION public.notify_new_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_type = 'student' THEN
    INSERT INTO public.admin_notifications (type, title, message, link, metadata)
    VALUES (
      'new_student',
      'طالب جديد سجّل في المنصة',
      COALESCE(NULLIF(NEW.full_name, ''), 'طالب جديد') || ' انضم للمنصة',
      '/admin/students',
      jsonb_build_object('user_id', NEW.user_id, 'full_name', NEW.full_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_student
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_student();

-- Trigger: notify on low rating
CREATE OR REPLACE FUNCTION public.notify_low_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title TEXT;
BEGIN
  IF NEW.rating <= 2 THEN
    SELECT title INTO v_course_title FROM public.courses WHERE id = NEW.course_id;
    INSERT INTO public.admin_notifications (type, title, message, link, metadata)
    VALUES (
      'low_rating',
      'تقييم منخفض جديد (' || NEW.rating || ' ⭐)',
      'تم استلام تقييم ' || NEW.rating || ' نجوم على كورس "' || COALESCE(v_course_title, 'غير معروف') || '"',
      '/admin/reviews',
      jsonb_build_object('course_id', NEW.course_id, 'rating', NEW.rating, 'review_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_rating
AFTER INSERT ON public.course_reviews
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_rating();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;