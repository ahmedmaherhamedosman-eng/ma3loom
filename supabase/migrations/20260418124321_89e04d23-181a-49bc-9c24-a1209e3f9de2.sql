-- 1) Add certificate_requirement enum-like column to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS certificate_requirement TEXT NOT NULL DEFAULT 'completion'
  CHECK (certificate_requirement IN ('completion', 'quiz', 'both', 'none'));

-- 2) Helper: check if a user is eligible for a certificate for a course
CREATE OR REPLACE FUNCTION public.is_eligible_for_certificate(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req TEXT;
  v_progress INTEGER := 0;
  v_passed BOOLEAN := false;
  v_quiz_id UUID;
BEGIN
  SELECT certificate_requirement INTO v_req FROM public.courses WHERE id = _course_id;
  IF v_req IS NULL OR v_req = 'none' THEN
    RETURN false;
  END IF;

  SELECT COALESCE(progress_percentage, 0) INTO v_progress
  FROM public.enrollments
  WHERE user_id = _user_id AND course_id = _course_id;

  SELECT id INTO v_quiz_id
  FROM public.quizzes
  WHERE course_id = _course_id AND is_published = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_quiz_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.quiz_attempts
      WHERE user_id = _user_id AND quiz_id = v_quiz_id AND passed = true
    ) INTO v_passed;
  END IF;

  IF v_req = 'completion' THEN
    RETURN v_progress >= 100;
  ELSIF v_req = 'quiz' THEN
    RETURN v_passed;
  ELSIF v_req = 'both' THEN
    RETURN v_progress >= 100 AND v_passed;
  END IF;

  RETURN false;
END;
$$;

-- 3) Allow users to insert their own certificates only if eligible
DROP POLICY IF EXISTS "Users insert own certificates if eligible" ON public.certificates;
CREATE POLICY "Users insert own certificates if eligible"
ON public.certificates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_eligible_for_certificate(auth.uid(), course_id)
);

-- 4) Prevent duplicate certificates per (user, course)
CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_course_unique
  ON public.certificates(user_id, course_id);

-- 5) Trigger: auto-update quiz_attempts.passed based on quiz.passing_score
CREATE OR REPLACE FUNCTION public.set_quiz_attempt_passed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass INTEGER;
BEGIN
  SELECT passing_score INTO v_pass FROM public.quizzes WHERE id = NEW.quiz_id;
  IF v_pass IS NULL THEN v_pass := 70; END IF;
  NEW.passed := (NEW.score >= v_pass);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_quiz_attempt_passed ON public.quiz_attempts;
CREATE TRIGGER trg_set_quiz_attempt_passed
BEFORE INSERT ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.set_quiz_attempt_passed();