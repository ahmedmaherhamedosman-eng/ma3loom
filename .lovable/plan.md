
# قسم الألعاب التعليمية (Gamification) — خطة تنفيذية

نظام كامل جدًا (14 قسم، ~13 جدول، 20+ نوع لعبة، شهادات، متصدرين، تحديات). لا يمكن بناؤه في جلسة واحدة بجودة إنتاجية. سأنفّذه على مراحل، كل مرحلة قابلة للاستخدام بمفردها.

## البنية التقنية (نبقى على نفس Stack المنصة)
- TanStack Start + React + TypeScript + Tailwind (موجود).
- Lovable Cloud (Supabase) لقاعدة البيانات + Auth + Storage + RLS.
- Framer Motion للحركات، jsPDF + QRCode للشهادات (مستخدَم بالفعل في `src/lib/certificate.ts`).
- كل الألعاب "Data-Driven": محرّك لعبة واحد + JSON للمحتوى → إضافة لعبة جديدة = صف في DB بدون كود.

## قاعدة البيانات (Phase 1 — migration واحد)
جداول جديدة (كلها RLS + GRANT):
- `game_categories` (slug, name_ar, name_en, icon, color, sort)
- `games` (category_id, type, title, description, cover, difficulty, xp_reward, coins_reward, content jsonb, is_published)
- `game_levels` (min_xp, name_ar, badge_icon, color)
- `badges` / `achievements` (code, name, icon, criteria jsonb)
- `user_progress` (user_id, xp, coins, stars, current_level, streak_days, last_played_at)
- `game_attempts` (user_id, game_id, score, stars, time_seconds, completed, played_at)
- `user_badges` / `user_achievements`
- `daily_challenges` (date, game_id, bonus_xp) + `user_challenges`
- `game_certificates` (user_id, track_id, code, issued_at)
- View: `leaderboard_view` (aggregate xp per user + filters).

RLS: زوّار (anon) يقرؤون games/categories/leaderboard فقط. التقدّم/الشهادات = `auth.uid()` فقط. تريجر `handle_new_user` يُنشئ صف `user_progress`.

## محرّك الألعاب — Phase 2
Component واحد `<GamePlayer game={...} />` يوجّه حسب `game.type` إلى:
- `QuizGame`, `TrueFalseGame`, `MultipleChoiceGame`, `FillBlankGame`
- `MatchCardsGame`, `MemoryGame`, `DragDropGame`, `ConnectPairsGame`
- `WordSearchGame`, `HangmanGame`, `WordOrderGame`, `SentenceOrderGame`
- `ImageSortGame`, `CategorizeGame`, `SpeedRaceGame`
- `PuzzleGame`, `CrosswordGame`, `MazeGame`, `StarCollectorGame`, `AdventureGame`

المرحلة 2 تبني 6 ألعاب أساسية (Quiz, TrueFalse, MatchCards, Memory, DragDrop, FillBlank) — تغطي 80% من الاحتياج. الباقي في Phase 5.

كل لعبة: onComplete(score, stars, timeSec) → hook `useGameSession` يحفظ في `game_attempts` + يحدّث XP/coins/badges + يعرض modal فوز مع أنيميشن ومؤثر صوتي اختياري.

الزوّار: التقدم في `sessionStorage`. عند بلوغ عتبة (مثلاً 50 XP أو نهاية level) → modal "سجّل لحفظ تقدّمك واستلام الشهادة".

## الصفحات — Phase 3
- `/play` — الصفحة الرئيسية: Banner، بطاقة مستوى/XP/coins/badges، شريط streak، تحدي اليوم، ألعاب مقترحة/جديدة، شبكة تصنيفات ملوّنة.
- `/play/category/$slug` — ألعاب تصنيف معيّن.
- `/play/$gameId` — مشغّل اللعبة.
- `/play/leaderboard` — متصدرون مع فلاتر (دولة/صف/مادة/الأسبوع).
- `/play/achievements` — كل الشارات/الأوسمة (مقفولة ومفتوحة).
- `/play/certificates` — شهادات المسارات + تحميل PDF.
- `/dashboard` (تعديل) — تبويب "ألعابي" يعرض التقدم والنشاط اليومي.

## لوحة المعلّم — Phase 4
- `/admin/games` — إضافة/تعديل/نشر لعبة، اختيار النوع، محرّر محتوى JSON مبسّط لكل نوع (form ديناميكي).
- `/admin/challenges` — جدولة التحديات اليومية.
- `/admin/leaderboards` — عرض ومتابعة.

## Phase 5 — الألعاب المتقدّمة والتلميع
باقي أنواع الألعاب (Crossword, Maze, Adventure…)، Sound FX، Confetti، شهادات PDF بتصميم أطفال، i18n كامل EN.

---

## الهوية البصرية للأطفال
- ألوان أكثر حيوية داخل قسم `/play` فقط (accent برتقالي + primary indigo موجودَين، نضيف gradients ملوّنة لكل تصنيف).
- بطاقات كبيرة، أيقونات emoji ضخمة، أنيميشن bounce/pop، تأثيرات عند الإجابة الصحيحة.
- خط Cairo موجود، نكبّر الأحجام في هذا القسم.

---

## ما سأنفّذه الآن (اقتراح البداية)

سأبدأ بـ **Phase 1 (DB) + Phase 2 (محرّك + 6 ألعاب) + الصفحة الرئيسية `/play` + مشغّل اللعبة + تبويب في dashboard**. هذه القاعدة الصلبة القابلة للاستخدام فورًا. المتصدرون، الشهادات، لوحة المعلم، وباقي الألعاب في تكرارات لاحقة.

**ملاحظة:** يوجد بالفعل `educational_games` + `/games` (ألعاب HTML/URL خارجية للمراهقين). القسم الجديد `/play` مختلف تمامًا (ألعاب أصلية Data-Driven للأطفال). سأتركها جنبًا إلى جنب دون كسر.

هل أبدأ بـ Phase 1 الآن، أم تريد تعديل النطاق أولاً (مثلاً: البدء بالمتصدرين قبل الشهادات، أو تقليل عدد أنواع الألعاب في الدفعة الأولى)؟
