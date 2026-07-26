
-- Convert to SECURITY INVOKER (rely on caller's RLS)
CREATE OR REPLACE FUNCTION public.can_review_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _user_id
      AND course_id = _course_id
      AND progress_percentage >= 50
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_eligible_for_certificate(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
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
$function$;
