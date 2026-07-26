
-- ========= CATEGORIES =========
CREATE TABLE public.game_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  icon TEXT NOT NULL DEFAULT '🎯',
  color TEXT NOT NULL DEFAULT '#6366f1',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_categories TO anon, authenticated;
GRANT ALL ON public.game_categories TO service_role;
ALTER TABLE public.game_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.game_categories FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories_admin_all" ON public.game_categories FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_game_categories_updated BEFORE UPDATE ON public.game_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= GAMES =========
CREATE TABLE public.play_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.game_categories(id) ON DELETE SET NULL,
  slug TEXT UNIQUE,
  type TEXT NOT NULL, -- quiz, true_false, multiple_choice, fill_blank, match_cards, memory, drag_drop, connect_pairs, word_search, hangman, word_order, sentence_order, image_sort, categorize, speed_race, puzzle, crossword, maze, star_collector, adventure
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  age_min INT DEFAULT 5,
  age_max INT DEFAULT 12,
  difficulty TEXT NOT NULL DEFAULT 'easy', -- easy, medium, hard
  xp_reward INT NOT NULL DEFAULT 10,
  coins_reward INT NOT NULL DEFAULT 5,
  time_limit_seconds INT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  plays_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.play_games TO anon, authenticated;
GRANT ALL ON public.play_games TO service_role;
GRANT UPDATE (plays_count) ON public.play_games TO authenticated, anon;
ALTER TABLE public.play_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "games_public_read" ON public.play_games FOR SELECT USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "games_admin_all" ON public.play_games FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "games_plays_count_bump" ON public.play_games FOR UPDATE USING (is_published = true) WITH CHECK (is_published = true);
CREATE TRIGGER trg_play_games_updated BEFORE UPDATE ON public.play_games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_play_games_category ON public.play_games(category_id);
CREATE INDEX idx_play_games_published ON public.play_games(is_published, sort_order);

-- ========= LEVELS =========
CREATE TABLE public.game_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INT NOT NULL UNIQUE,
  min_xp INT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  icon TEXT NOT NULL DEFAULT '⭐',
  color TEXT NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_levels TO anon, authenticated;
GRANT ALL ON public.game_levels TO service_role;
ALTER TABLE public.game_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels_public_read" ON public.game_levels FOR SELECT USING (true);
CREATE POLICY "levels_admin_all" ON public.game_levels FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========= BADGES =========
CREATE TABLE public.game_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '🏅',
  color TEXT NOT NULL DEFAULT '#f59e0b',
  xp_reward INT NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_badges TO anon, authenticated;
GRANT ALL ON public.game_badges TO service_role;
ALTER TABLE public.game_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_public_read" ON public.game_badges FOR SELECT USING (true);
CREATE POLICY "badges_admin_all" ON public.game_badges FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========= ACHIEVEMENTS =========
CREATE TABLE public.game_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '🏆',
  xp_reward INT NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_achievements TO anon, authenticated;
GRANT ALL ON public.game_achievements TO service_role;
ALTER TABLE public.game_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_public_read" ON public.game_achievements FOR SELECT USING (true);
CREATE POLICY "achievements_admin_all" ON public.game_achievements FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ========= USER PROGRESS =========
CREATE TABLE public.user_game_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  coins INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  trophies INT NOT NULL DEFAULT 0,
  current_level INT NOT NULL DEFAULT 1,
  streak_days INT NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_game_progress TO authenticated;
GRANT SELECT ON public.user_game_progress TO anon;
GRANT ALL ON public.user_game_progress TO service_role;
ALTER TABLE public.user_game_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_self_read" ON public.user_game_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_leaderboard_read" ON public.user_game_progress FOR SELECT USING (true);
CREATE POLICY "progress_self_insert" ON public.user_game_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_self_update" ON public.user_game_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_game_progress_updated BEFORE UPDATE ON public.user_game_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========= ATTEMPTS =========
CREATE TABLE public.game_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.play_games(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  stars INT NOT NULL DEFAULT 0,
  xp_earned INT NOT NULL DEFAULT 0,
  coins_earned INT NOT NULL DEFAULT 0,
  time_seconds INT,
  completed BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.game_attempts TO authenticated;
GRANT ALL ON public.game_attempts TO service_role;
ALTER TABLE public.game_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_self_all" ON public.game_attempts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_game_attempts_user ON public.game_attempts(user_id, played_at DESC);
CREATE INDEX idx_game_attempts_game ON public.game_attempts(game_id);

-- ========= USER BADGES / ACHIEVEMENTS =========
CREATE TABLE public.user_game_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.game_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
GRANT SELECT, INSERT ON public.user_game_badges TO authenticated;
GRANT ALL ON public.user_game_badges TO service_role;
ALTER TABLE public.user_game_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_self_all" ON public.user_game_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_game_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.game_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_game_achievements TO authenticated;
GRANT ALL ON public.user_game_achievements TO service_role;
ALTER TABLE public.user_game_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements_self_all" ON public.user_game_achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========= DAILY CHALLENGES =========
CREATE TABLE public.daily_game_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL UNIQUE,
  game_id UUID REFERENCES public.play_games(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  bonus_xp INT NOT NULL DEFAULT 50,
  bonus_coins INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_game_challenges TO anon, authenticated;
GRANT ALL ON public.daily_game_challenges TO service_role;
ALTER TABLE public.daily_game_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_public_read" ON public.daily_game_challenges FOR SELECT USING (true);
CREATE POLICY "daily_admin_all" ON public.daily_game_challenges FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_game_challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);
GRANT SELECT, INSERT ON public.user_daily_challenges TO authenticated;
GRANT ALL ON public.user_daily_challenges TO service_role;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_daily_self_all" ON public.user_daily_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========= AUTO-CREATE PROGRESS ON SIGNUP =========
CREATE OR REPLACE FUNCTION public.handle_new_user_game_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_game_progress (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_game_progress() FROM anon, authenticated;
CREATE TRIGGER on_auth_user_created_game_progress
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_game_progress();

-- Backfill for existing users
INSERT INTO public.user_game_progress (user_id)
  SELECT id FROM auth.users ON CONFLICT DO NOTHING;

-- ========= SEED DATA =========
INSERT INTO public.game_categories (slug, name_ar, name_en, icon, color, sort_order) VALUES
  ('reading',       'القراءة والكتابة', 'Reading & Writing', '📖', '#3b82f6', 1),
  ('math',          'الرياضيات',          'Mathematics',       '➕', '#f97316', 2),
  ('science',       'العلوم',             'Science',           '🧪', '#10b981', 3),
  ('social',        'الدراسات الاجتماعية','Social Studies',    '🌍', '#06b6d4', 4),
  ('islamic',       'التربية الإسلامية',  'Islamic Studies',   '🕌', '#8b5cf6', 5),
  ('brain',         'الذكاء والتركيز',    'Brain & Focus',     '🧠', '#ec4899', 6),
  ('creativity',    'الإبداع',            'Creativity',        '🎨', '#eab308', 7),
  ('skills',        'ألعاب المهارات',     'Skills',            '🎯', '#ef4444', 8);

INSERT INTO public.game_levels (level_number, min_xp, name_ar, name_en, icon, color) VALUES
  (1,     0, 'مستكشف صغير',    'Little Explorer',      '🌱', '#10b981'),
  (2,   200, 'باحث مبتدئ',      'Junior Researcher',    '🔍', '#3b82f6'),
  (3,   600, 'عالم صغير',       'Young Scientist',      '🔬', '#8b5cf6'),
  (4,  1500, 'مكتشف المعرفة',   'Knowledge Discoverer', '🧭', '#f97316'),
  (5,  3000, 'بطل معلوم',       'Ma3loom Hero',         '🦸', '#ec4899'),
  (6,  6000, 'قائد المعرفة',    'Knowledge Leader',     '🎖️', '#eab308'),
  (7, 12000, 'أسطورة معلوم',    'Ma3loom Legend',       '👑', '#dc2626');

INSERT INTO public.game_badges (code, name_ar, name_en, description, icon, xp_reward, criteria) VALUES
  ('first_game',     'أول لعبة',           'First Game',         'أنهيت أول لعبة!',              '🎮', 20,  '{"attempts_gte":1}'),
  ('hundred_xp',     'مئة نقطة',           '100 XP',             'جمعت أول 100 نقطة',            '⭐', 30,  '{"xp_gte":100}'),
  ('first_trophy',   'أول كأس',            'First Trophy',       'حصلت على أول كأس',             '🏆', 50,  '{"trophies_gte":1}'),
  ('week_streak',    'أسبوع متواصل',       '7-Day Streak',       'لعبت 7 أيام متتالية',          '🔥', 100, '{"streak_gte":7}'),
  ('unit_master',    'أتقن وحدة',          'Unit Master',        'أنهيت وحدة كاملة',              '📚', 80,  '{"unit_completed":true}'),
  ('course_master',  'أتقن مقرراً',        'Course Master',      'أنهيت مقرراً كاملاً',           '🎓', 200, '{"course_completed":true}'),
  ('legend',         'أسطورة',             'Legend',             'وصلت لأعلى مستوى',              '👑', 500, '{"level_gte":7}');

INSERT INTO public.game_achievements (code, name_ar, name_en, description, icon, xp_reward, criteria) VALUES
  ('speed_demon',    'سريع كالبرق',        'Speed Demon',        'أنهيت لعبة في أقل من 60 ثانية', '⚡', 40, '{"time_lte":60}'),
  ('perfect_score',  'إجابة كاملة',        'Perfect Score',      'حققت 100% في لعبة',              '💯', 60, '{"score_eq":100}'),
  ('combo_10',       '10 إجابات متتالية',  '10 Combo',           '10 إجابات صحيحة متتالية',        '🔗', 50, '{"combo_gte":10}'),
  ('night_owl',      'بومة الليل',         'Night Owl',          'لعبت بعد منتصف الليل',           '🦉', 25, '{"hour_gte":0}'),
  ('collector',      'الجامع',             'Collector',          'جمعت 500 عملة',                  '💰', 70, '{"coins_gte":500}');
