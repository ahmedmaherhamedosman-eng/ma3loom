-- Create educational_games table
CREATE TABLE public.educational_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  game_type TEXT NOT NULL DEFAULT 'url' CHECK (game_type IN ('url', 'file')),
  game_url TEXT,
  html_file_path TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  plays_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.educational_games ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
CREATE POLICY "Admins manage games"
ON public.educational_games
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated students view published games (with course restriction)
CREATE POLICY "Enrolled students view published games"
ON public.educational_games
FOR SELECT
TO authenticated
USING (
  is_published = true AND (
    course_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = educational_games.course_id
        AND enrollments.user_id = auth.uid()
    )
  )
);

-- Updated_at trigger
CREATE TRIGGER update_educational_games_updated_at
BEFORE UPDATE ON public.educational_games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for HTML game files
INSERT INTO storage.buckets (id, name, public)
VALUES ('educational-games', 'educational-games', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admins manage, authenticated read
CREATE POLICY "Admins upload game files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'educational-games' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update game files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'educational-games' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete game files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'educational-games' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read game files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'educational-games');