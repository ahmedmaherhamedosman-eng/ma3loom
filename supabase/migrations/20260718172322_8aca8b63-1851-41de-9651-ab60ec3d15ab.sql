
-- 1. Lock down SECURITY DEFINER helpers
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_course(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_eligible_for_certificate(uuid, uuid) TO authenticated;

-- 2. Restrict SELECT on course_reviews & lesson_comments to authenticated
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.course_reviews;
CREATE POLICY "Reviews viewable by authenticated"
  ON public.course_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.lesson_comments;
CREATE POLICY "Comments viewable by authenticated"
  ON public.lesson_comments FOR SELECT TO authenticated USING (true);

-- 3. Drop overly-permissive public SELECT policies on storage.objects
DROP POLICY IF EXISTS "Books bucket public read" ON storage.objects;
DROP POLICY IF EXISTS "Public can view lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;

-- 4. Access policies for now-private books/lesson-videos buckets
CREATE POLICY "Read book files if free, purchased or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'books' AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.pdf_path = storage.objects.name
          AND (
            b.is_free
            OR EXISTS (
              SELECT 1 FROM public.book_purchases bp
              WHERE bp.book_id = b.id AND bp.user_id = auth.uid()
            )
          )
      )
    )
  );

CREATE POLICY "Read lesson videos if enrolled or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-videos' AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.enrollments e ON e.course_id = l.course_id
        WHERE l.video_url LIKE '%/lesson-videos/' || storage.objects.name
          AND e.user_id = auth.uid()
      )
    )
  );
