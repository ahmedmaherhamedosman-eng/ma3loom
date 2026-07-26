-- Allow students to enroll themselves in any course that is effectively free
-- (either flagged is_free OR has price = 0). Previously only is_free=true worked,
-- which caused silent INSERT failures for $0 courses that admins forgot to flag.
DROP POLICY IF EXISTS "Users can enroll themselves in free courses" ON public.enrollments;

CREATE POLICY "Users can enroll themselves in free courses"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = enrollments.course_id
      AND (courses.is_free = true OR courses.price = 0)
  )
);