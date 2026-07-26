-- Create books table
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  description TEXT,
  cover_url TEXT,
  pdf_url TEXT,
  pdf_path TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  education_level TEXT NOT NULL DEFAULT 'عام',
  language TEXT NOT NULL DEFAULT 'ar',
  pages_count INTEGER NOT NULL DEFAULT 0,
  file_size_mb NUMERIC NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published books viewable by everyone"
  ON public.books FOR SELECT TO public
  USING (is_published = true);

CREATE POLICY "Admins manage books"
  ON public.books FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track who purchased/downloaded paid books
CREATE TABLE public.book_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.book_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
  ON public.book_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage purchases"
  ON public.book_purchases FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for book PDFs and covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Books bucket public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'books');

CREATE POLICY "Admins upload books"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'books' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update books storage"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'books' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete books storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'books' AND has_role(auth.uid(), 'admin'::app_role));