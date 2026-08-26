CREATE TABLE public.social_links (
  platform TEXT PRIMARY KEY CHECK (platform IN ('facebook', 'youtube', 'tiktok')),
  url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social links are publicly readable"
  ON public.social_links FOR SELECT
  USING (true);

CREATE POLICY "Admins manage social links"
  ON public.social_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.social_links (platform, url) VALUES
  ('facebook', 'https://www.facebook.com/people/%D9%85%D9%8E%D8%B9%D9%84%D9%8F%D9%88%D9%85-%D8%A7%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85%D9%8A%D8%A9/61592678940406/?rdid=zpQTm0J8hUEWSdKW&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1AqyVbBk9s%2F'),
  ('youtube', 'https://www.youtube.com/@ma3looom'),
  ('tiktok', 'https://www.tiktok.com/@ma3loom2026')
ON CONFLICT (platform) DO NOTHING;