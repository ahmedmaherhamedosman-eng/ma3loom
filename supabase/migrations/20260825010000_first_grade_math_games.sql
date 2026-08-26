-- Seed playable mathematics games for first-grade students.
INSERT INTO public.play_games (
  category_id, slug, type, title, description, age_min, age_max, difficulty,
  xp_reward, coins_reward, content, is_published, is_new, is_featured, sort_order
)
SELECT
  c.id, v.slug, 'quiz', v.title, v.description, 6, 7, 'easy',
  30, 10, v.content::jsonb, true, true, true, v.sort_order
FROM public.game_categories c
CROSS JOIN (VALUES
  (
    'first-grade-counting',
    'عدّ النجوم',
    'تدرّب على عدّ الأشياء حتى 10.',
    '{"questions":[{"q":"كم نجمة؟ ⭐ ⭐ ⭐","options":["2","3","4","5"],"answer":1},{"q":"كم تفاحة؟ 🍎 🍎 🍎 🍎 🍎","options":["4","5","6","7"],"answer":1},{"q":"أي عدد يأتي بعد 6؟","options":["5","7","8","9"],"answer":1},{"q":"كم بالونة؟ 🎈 🎈 🎈 🎈","options":["3","4","5","6"],"answer":1}]}'
    ,1
  ),
  (
    'first-grade-addition',
    'جمع الأعداد',
    'حل مسائل جمع بسيطة بطريقة ممتعة.',
    '{"questions":[{"q":"كم يساوي 2 + 1؟","options":["2","3","4","5"],"answer":1},{"q":"كم يساوي 3 + 2؟","options":["4","5","6","7"],"answer":1},{"q":"لدى سارة 4 أقلام وأضافت قلماً. كم أصبح لديها؟","options":["3","4","5","6"],"answer":2},{"q":"كم يساوي 5 + 0؟","options":["0","4","5","6"],"answer":2}]}'
    ,2
  ),
  (
    'first-grade-subtraction',
    'مغامرة الطرح',
    'اكتشف ناتج الطرح من 0 إلى 10.',
    '{"questions":[{"q":"كم يساوي 5 - 2؟","options":["2","3","4","5"],"answer":1},{"q":"كم يساوي 7 - 1؟","options":["5","6","7","8"],"answer":1},{"q":"كان لديك 6 مكعبات وأعطيت 3. كم بقي؟","options":["2","3","4","5"],"answer":1},{"q":"كم يساوي 4 - 0؟","options":["0","3","4","5"],"answer":2}]}'
    ,3
  ),
  (
    'first-grade-shapes',
    'عالم الأشكال',
    'ميّز بين الأشكال الهندسية الأساسية.',
    '{"questions":[{"q":"أي شكل له 3 أضلاع؟","options":["دائرة","مثلث","مربع","مستطيل"],"answer":1},{"q":"أي شكل يشبه الكرة؟","options":["دائرة","مثلث","مربع","مستطيل"],"answer":0},{"q":"كم ضلعاً للمربع؟","options":["2","3","4","5"],"answer":2},{"q":"أي شكل له 4 أضلاع متساوية؟","options":["دائرة","مثلث","مربع","نجمة"],"answer":2}]}'
    ,4
  )
) AS v(slug, title, description, content, sort_order)
WHERE c.slug = 'math'
ON CONFLICT (slug) DO NOTHING;
