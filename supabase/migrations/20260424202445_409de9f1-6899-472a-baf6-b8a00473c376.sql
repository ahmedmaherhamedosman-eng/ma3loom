-- Create html_quizzes table
CREATE TABLE public.html_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'file', -- 'file' | 'code' | 'url'
  html_content TEXT, -- when source_type = 'code'
  html_file_path TEXT, -- when source_type = 'file' (path in bucket)
  external_url TEXT, -- when source_type = 'url'
  course_id UUID, -- optional link to a course
  access_type TEXT NOT NULL DEFAULT 'public', -- 'public' | 'authenticated' | 'course_enrolled'
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
  estimated_minutes INTEGER DEFAULT 15,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.html_quizzes ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage html quizzes"
  ON public.html_quizzes
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public quizzes visible to everyone
CREATE POLICY "Public html quizzes viewable by everyone"
  ON public.html_quizzes
  FOR SELECT
  TO public
  USING (is_published = true AND access_type = 'public');

-- Authenticated quizzes visible to logged-in users
CREATE POLICY "Authenticated html quizzes viewable by logged in users"
  ON public.html_quizzes
  FOR SELECT
  TO authenticated
  USING (is_published = true AND access_type = 'authenticated');

-- Course-enrolled quizzes visible only to enrolled students
CREATE POLICY "Course enrolled html quizzes viewable by enrolled students"
  ON public.html_quizzes
  FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND access_type = 'course_enrolled'
    AND course_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = html_quizzes.course_id
        AND enrollments.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_html_quizzes_updated_at
  BEFORE UPDATE ON public.html_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for html quiz files
INSERT INTO storage.buckets (id, name, public)
VALUES ('html-quizzes', 'html-quizzes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "HTML quiz files publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'html-quizzes');

CREATE POLICY "Admins upload html quiz files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'html-quizzes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update html quiz files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'html-quizzes' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete html quiz files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'html-quizzes' AND has_role(auth.uid(), 'admin'::app_role));