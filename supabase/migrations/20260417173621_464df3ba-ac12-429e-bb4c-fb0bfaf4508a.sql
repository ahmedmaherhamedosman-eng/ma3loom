-- 1) Add is_preview flag to lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lessons_preview ON public.lessons(course_id, is_preview) WHERE is_preview = true;

-- 2) Update lesson_resources SELECT policy to allow preview lessons
DROP POLICY IF EXISTS "Resources viewable for enrolled or free or admin" ON public.lesson_resources;

CREATE POLICY "Resources viewable for enrolled or free or admin or preview"
ON public.lesson_resources
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lesson_resources.lesson_id
      AND (
        c.is_free = true
        OR l.is_preview = true
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = c.id AND e.user_id = auth.uid()
        )
      )
  )
);