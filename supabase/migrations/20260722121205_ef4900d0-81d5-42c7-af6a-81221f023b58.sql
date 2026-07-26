
-- 1) Attach missing triggers so existing guard functions actually run

DROP TRIGGER IF EXISTS trg_prevent_enrollment_progress_forgery ON public.enrollments;
CREATE TRIGGER trg_prevent_enrollment_progress_forgery
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.prevent_enrollment_progress_forgery();

DROP TRIGGER IF EXISTS trg_compute_quiz_attempt_score ON public.quiz_attempts;
CREATE TRIGGER trg_compute_quiz_attempt_score
BEFORE INSERT OR UPDATE ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.compute_quiz_attempt_score();

DROP TRIGGER IF EXISTS trg_enforce_lesson_completion_threshold ON public.lesson_progress;
CREATE TRIGGER trg_enforce_lesson_completion_threshold
BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_lesson_completion_threshold();

-- 2) Tighten enrollments UPDATE policy with a WITH CHECK clause
DROP POLICY IF EXISTS "Users can update their own enrollments" ON public.enrollments;
CREATE POLICY "Users can update their own enrollments"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3) Revoke EXECUTE on trigger-only SECURITY DEFINER helpers from public roles
REVOKE EXECUTE ON FUNCTION public.prevent_enrollment_progress_forgery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_quiz_attempt_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_lesson_completion_threshold() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_quiz_attempt_passed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_enrollment_progress() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_course_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_live_session_capacity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_session_bookings_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_lesson_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_lesson_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_low_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_student() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_live_booking() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
