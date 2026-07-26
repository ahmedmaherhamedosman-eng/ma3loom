-- 1) Specialties table
CREATE TABLE public.tutoring_specialties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '📚',
  price_per_hour NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tutoring_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active specialties viewable by everyone"
ON public.tutoring_specialties FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage specialties"
ON public.tutoring_specialties FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tutoring_specialties_updated_at
BEFORE UPDATE ON public.tutoring_specialties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Lesson requests table
CREATE TABLE public.lesson_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  specialty_id UUID NOT NULL REFERENCES public.tutoring_specialties(id) ON DELETE RESTRICT,
  student_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  education_level TEXT,
  preferred_time TEXT,
  sessions_per_week INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own requests"
ON public.lesson_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own requests"
ON public.lesson_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all requests"
ON public.lesson_requests FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lesson_requests_updated_at
BEFORE UPDATE ON public.lesson_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Notify admin on new request
CREATE OR REPLACE FUNCTION public.notify_new_lesson_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_specialty TEXT;
BEGIN
  SELECT name INTO v_specialty FROM public.tutoring_specialties WHERE id = NEW.specialty_id;
  INSERT INTO public.admin_notifications (type, title, message, link, metadata)
  VALUES (
    'lesson_request',
    'طلب حصة أونلاين جديد',
    NEW.student_name || ' طلب حصة في "' || COALESCE(v_specialty, 'غير معروف') || '"',
    '/admin/lesson-requests',
    jsonb_build_object('request_id', NEW.id, 'user_id', NEW.user_id, 'specialty_id', NEW.specialty_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_lesson_request
AFTER INSERT ON public.lesson_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_lesson_request();

-- 4) Seed specialties
INSERT INTO public.tutoring_specialties (name, slug, description, icon, price_per_hour, sort_order) VALUES
  ('تحفيظ القرآن الكريم', 'quran-memorization', 'حصص فردية لتحفيظ القرآن الكريم مع التجويد على يد معلمين متخصصين', '📖', 50, 1),
  ('الرياضيات', 'mathematics', 'دروس خصوصية في الرياضيات لجميع المراحل الدراسية', '🔢', 60, 2),
  ('اللغة الإنجليزية', 'english', 'تعلم الإنجليزية محادثة وقواعد مع معلمين معتمدين', '🇬🇧', 55, 3),
  ('اللغة العربية', 'arabic', 'دروس في النحو والصرف والإملاء والتعبير', '🔤', 50, 4),
  ('الفيزياء', 'physics', 'حل المسائل وشرح المفاهيم لطلاب الثانوي والجامعة', '⚛️', 65, 5),
  ('البرمجة', 'programming', 'تعلم البرمجة من الصفر للاحتراف', '💻', 70, 6);