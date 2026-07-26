
-- =========================================================
-- 1) live_booking_bypass: require free session for self-insert
-- =========================================================
DROP POLICY IF EXISTS "Users insert own bookings" ON public.live_session_bookings;
CREATE POLICY "Users insert own free bookings"
ON public.live_session_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.id = live_session_bookings.session_id
      AND (ls.is_free = true OR ls.price = 0)
  )
);

-- =========================================================
-- 2) cert_progress_forge: server-computed progress + quiz score
-- =========================================================

-- Enrollments: prevent client from directly writing derived fields on UPDATE
CREATE OR REPLACE FUNCTION public.prevent_enrollment_progress_forgery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Allow service_role/webhook & DB owner to update freely; block regular users
  IF v_role IS DISTINCT FROM 'service_role' THEN
    NEW.progress_percentage := OLD.progress_percentage;
    NEW.progress := OLD.progress;
    NEW.completed := OLD.completed;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_enrollment_progress_forgery ON public.enrollments;
CREATE TRIGGER trg_prevent_enrollment_progress_forgery
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.prevent_enrollment_progress_forgery();

-- Lesson progress: only mark completed when watched_seconds meets threshold
CREATE OR REPLACE FUNCTION public.enforce_lesson_completion_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration_minutes integer;
  v_required_seconds integer;
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT duration_minutes INTO v_duration_minutes
  FROM public.lessons WHERE id = NEW.lesson_id;

  IF v_duration_minutes IS NULL OR v_duration_minutes <= 0 THEN
    -- Unknown duration; require at least 30s of watch time before completion
    v_required_seconds := 30;
  ELSE
    v_required_seconds := GREATEST(30, (v_duration_minutes * 60 * 8) / 10); -- 80%
  END IF;

  IF COALESCE(NEW.watched_seconds, 0) < v_required_seconds THEN
    NEW.completed := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_lesson_completion_threshold ON public.lesson_progress;
CREATE TRIGGER trg_enforce_lesson_completion_threshold
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_lesson_completion_threshold();

-- Quiz attempts: recompute score & passed from answers vs correct_option
CREATE OR REPLACE FUNCTION public.compute_quiz_attempt_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  v_correct integer := 0;
  v_pass integer;
  v_computed_score integer := 0;
  q RECORD;
  v_ans jsonb := COALESCE(NEW.answers, '[]'::jsonb);
  v_selected int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.quiz_questions WHERE quiz_id = NEW.quiz_id;

  IF v_total > 0 THEN
    FOR q IN
      SELECT id, correct_option FROM public.quiz_questions WHERE quiz_id = NEW.quiz_id
    LOOP
      -- answers expected as array of objects { question_id, selected } OR
      -- mapping object { <question_id>: <selected> }
      IF jsonb_typeof(v_ans) = 'array' THEN
        SELECT (elem->>'selected')::int INTO v_selected
        FROM jsonb_array_elements(v_ans) elem
        WHERE elem->>'question_id' = q.id::text
        LIMIT 1;
      ELSIF jsonb_typeof(v_ans) = 'object' THEN
        v_selected := NULLIF(v_ans ->> q.id::text, '')::int;
      ELSE
        v_selected := NULL;
      END IF;

      IF v_selected IS NOT NULL AND v_selected = q.correct_option THEN
        v_correct := v_correct + 1;
      END IF;
    END LOOP;
    v_computed_score := ROUND((v_correct::numeric / v_total::numeric) * 100);
  END IF;

  NEW.score := v_computed_score;

  SELECT passing_score INTO v_pass FROM public.quizzes WHERE id = NEW.quiz_id;
  IF v_pass IS NULL THEN v_pass := 70; END IF;
  NEW.passed := (NEW.score >= v_pass);

  RETURN NEW;
END;
$$;

-- Replace existing trigger with the stricter one
DROP TRIGGER IF EXISTS trg_set_quiz_attempt_passed ON public.quiz_attempts;
DROP TRIGGER IF EXISTS trg_compute_quiz_attempt_score ON public.quiz_attempts;
CREATE TRIGGER trg_compute_quiz_attempt_score
BEFORE INSERT OR UPDATE ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.compute_quiz_attempt_score();

-- =========================================================
-- 3) educational_games_storage_bypass_enrollment
-- =========================================================
DROP POLICY IF EXISTS "Authenticated read game files" ON storage.objects;
CREATE POLICY "Enrolled read game files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'educational-games'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.educational_games g
      WHERE g.html_file_path = storage.objects.name
        AND g.is_published = true
        AND (
          g.course_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = g.course_id AND e.user_id = auth.uid()
          )
        )
    )
  )
);

-- =========================================================
-- 4) SUPA_authenticated_security_definer_function_executable
-- Revoke direct execute from PUBLIC/anon/authenticated on internal helpers.
-- Keep RLS helper functions callable by authenticated (needed inside policies).
-- =========================================================
DO $$
DECLARE
  fn text;
  keep_fns text[] := ARRAY['has_role','can_review_course','is_eligible_for_certificate'];
  all_fns text[] := ARRAY[
    'check_live_session_capacity',
    'handle_new_user',
    'handle_new_user_role',
    'notify_low_rating',
    'notify_new_lesson_comment',
    'notify_new_lesson_request',
    'notify_new_live_booking',
    'notify_new_student',
    'set_quiz_attempt_passed',
    'update_course_rating',
    'update_enrollment_progress',
    'update_session_bookings_count',
    'prevent_enrollment_progress_forgery',
    'enforce_lesson_completion_threshold',
    'compute_quiz_attempt_score'
  ];
BEGIN
  FOREACH fn IN ARRAY all_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
