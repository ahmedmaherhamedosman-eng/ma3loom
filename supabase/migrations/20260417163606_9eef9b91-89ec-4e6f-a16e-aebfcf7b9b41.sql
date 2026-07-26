
-- ============================================
-- 1. CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 2. COURSE_CATEGORIES (many-to-many)
-- ============================================
CREATE TABLE public.course_categories (
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, category_id)
);

CREATE INDEX idx_course_categories_course ON public.course_categories(course_id);
CREATE INDEX idx_course_categories_category ON public.course_categories(category_id);

ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Course categories viewable by everyone"
  ON public.course_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage course categories"
  ON public.course_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 3. CHAPTERS
-- ============================================
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapters_course ON public.chapters(course_id, sort_order);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chapters viewable for published courses"
  ON public.chapters FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = chapters.course_id AND is_published = true)
  );

CREATE POLICY "Admins manage chapters"
  ON public.chapters FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. ALTER LESSONS — add chapter_id + content
-- ============================================
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content TEXT;

CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons(chapter_id);

-- ============================================
-- 5. LESSON_RESOURCES (downloadable files)
-- ============================================
CREATE TABLE public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_resources_lesson ON public.lesson_resources(lesson_id, sort_order);

ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;

-- Resources viewable: admins, free courses, or enrolled users
CREATE POLICY "Resources viewable for enrolled or free or admin"
  ON public.lesson_resources FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_resources.lesson_id
        AND (
          c.is_free = true
          OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = c.id AND e.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Admins manage lesson resources"
  ON public.lesson_resources FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 6. ALTER COURSES — preview, ratings, views
-- ============================================
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS preview_video_url TEXT,
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 7. ALTER ENROLLMENTS — last lesson + progress %
-- ============================================
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS last_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 8. LESSON_PROGRESS
-- ============================================
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user_course ON public.lesson_progress(user_id, course_id);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress"
  ON public.lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress"
  ON public.lesson_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own progress"
  ON public.lesson_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all progress"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 9. UPDATE ENROLLMENT PROGRESS FUNCTION + TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_enrollment_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_course_id UUID;
  v_total INTEGER;
  v_completed INTEGER;
  v_pct INTEGER;
  v_last_lesson UUID;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  v_course_id := COALESCE(NEW.course_id, OLD.course_id);

  SELECT COUNT(*) INTO v_total
  FROM public.lessons
  WHERE course_id = v_course_id AND is_published = true;

  SELECT COUNT(*) INTO v_completed
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id
  WHERE lp.user_id = v_user_id
    AND lp.course_id = v_course_id
    AND lp.completed = true
    AND l.is_published = true;

  IF v_total > 0 THEN
    v_pct := ROUND((v_completed::NUMERIC / v_total) * 100);
  ELSE
    v_pct := 0;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    v_last_lesson := NEW.lesson_id;
  END IF;

  UPDATE public.enrollments
  SET progress_percentage = v_pct,
      progress = v_pct,
      completed = (v_pct >= 100),
      last_lesson_id = COALESCE(v_last_lesson, last_lesson_id),
      updated_at = now()
  WHERE user_id = v_user_id AND course_id = v_course_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_enrollment_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_progress();

-- ============================================
-- 10. CAN_REVIEW_COURSE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.can_review_course(_user_id UUID, _course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _user_id
      AND course_id = _course_id
      AND progress_percentage >= 50
  );
$$;

-- ============================================
-- 11. COURSE_REVIEWS
-- ============================================
CREATE TABLE public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX idx_course_reviews_course ON public.course_reviews(course_id);
CREATE INDEX idx_course_reviews_user ON public.course_reviews(user_id);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by everyone"
  ON public.course_reviews FOR SELECT
  USING (true);

CREATE POLICY "Users insert own review if completed 50%"
  ON public.course_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_review_course(auth.uid(), course_id)
  );

CREATE POLICY "Users update own review"
  ON public.course_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own review"
  ON public.course_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all reviews"
  ON public.course_reviews FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_course_reviews_updated_at
  BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 12. UPDATE COURSE RATING FUNCTION + TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_course_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_avg NUMERIC(3,2);
  v_count INTEGER;
BEGIN
  v_course_id := COALESCE(NEW.course_id, OLD.course_id);

  SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0), COUNT(*)
  INTO v_avg, v_count
  FROM public.course_reviews
  WHERE course_id = v_course_id;

  UPDATE public.courses
  SET rating_avg = v_avg,
      rating_count = v_count,
      updated_at = now()
  WHERE id = v_course_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_course_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_course_rating();

-- ============================================
-- 13. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;

ALTER TABLE public.course_reviews REPLICA IDENTITY FULL;
ALTER TABLE public.lesson_progress REPLICA IDENTITY FULL;
ALTER TABLE public.chapters REPLICA IDENTITY FULL;
ALTER TABLE public.categories REPLICA IDENTITY FULL;

-- ============================================
-- 14. SEED CATEGORIES
-- ============================================
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('برمجة', 'programming', 'Code', 1),
  ('رياضيات', 'math', 'Calculator', 2),
  ('علوم', 'science', 'Atom', 3),
  ('لغة إنجليزية', 'english', 'Languages', 4),
  ('لغة عربية', 'arabic', 'BookOpen', 5),
  ('تطوير ذاتي', 'self-development', 'Sparkles', 6)
ON CONFLICT (slug) DO NOTHING;
