
-- Create lesson_comments table
CREATE TABLE public.lesson_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_instructor_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_comments_lesson ON public.lesson_comments(lesson_id, created_at DESC);
CREATE INDEX idx_lesson_comments_parent ON public.lesson_comments(parent_id);
CREATE INDEX idx_lesson_comments_user ON public.lesson_comments(user_id);

-- Enable RLS
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Comments viewable by everyone"
ON public.lesson_comments FOR SELECT
USING (true);

-- Enrolled users (or admin) can post comments
CREATE POLICY "Enrolled users can post comments"
ON public.lesson_comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = lesson_comments.course_id
        AND enrollments.user_id = auth.uid()
    )
  )
  -- Only admins can mark a comment as instructor reply
  AND (is_instructor_reply = false OR has_role(auth.uid(), 'admin'::app_role))
);

-- Users update own comments
CREATE POLICY "Users update own comments"
ON public.lesson_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users delete own comments
CREATE POLICY "Users delete own comments"
ON public.lesson_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins manage all comments
CREATE POLICY "Admins manage all comments"
ON public.lesson_comments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER trg_lesson_comments_updated_at
BEFORE UPDATE ON public.lesson_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notify admin on new student comment
CREATE OR REPLACE FUNCTION public.notify_new_lesson_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson_title TEXT;
  v_course_title TEXT;
  v_user_name TEXT;
BEGIN
  -- Skip notifications for instructor replies (admin posting)
  IF NEW.is_instructor_reply = true THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_lesson_title FROM public.lessons WHERE id = NEW.lesson_id;
  SELECT title INTO v_course_title FROM public.courses WHERE id = NEW.course_id;
  SELECT COALESCE(NULLIF(full_name, ''), 'طالب') INTO v_user_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.admin_notifications (type, title, message, link, metadata)
  VALUES (
    'new_comment',
    'تعليق جديد على درس',
    v_user_name || ' علّق على درس "' || COALESCE(v_lesson_title, 'غير معروف') || '" في كورس "' || COALESCE(v_course_title, 'غير معروف') || '"',
    '/courses/' || NEW.course_id || '/lessons/' || NEW.lesson_id,
    jsonb_build_object(
      'comment_id', NEW.id,
      'lesson_id', NEW.lesson_id,
      'course_id', NEW.course_id,
      'user_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_lesson_comment
AFTER INSERT ON public.lesson_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_lesson_comment();
