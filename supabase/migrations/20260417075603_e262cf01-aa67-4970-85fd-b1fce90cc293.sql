-- Add platform and generic meeting_link columns to live_sessions
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'zoom',
  ADD COLUMN IF NOT EXISTS meeting_link text;

-- Add check constraint for supported platforms
ALTER TABLE public.live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_platform_check;
ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_platform_check
  CHECK (platform IN ('zoom', 'teams', 'google_meet'));

-- Backfill meeting_link from existing zoom_link values
UPDATE public.live_sessions
  SET meeting_link = zoom_link
  WHERE meeting_link IS NULL AND zoom_link IS NOT NULL;