import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayGame, GameCategory, GameLevel } from "@/lib/gameTypes";
import { useGameProgress } from "@/hooks/useGameSession";

interface DailyChallenge {
  title: string;
  description: string | null;
  bonus_xp: number;
  bonus_coins: number;
  game_id: string | null;
}

export const Route = createFileRoute("/play/")({
  head: () => ({
    meta: [
      { title: "الألعاب التعليمية للأطفال — معلوم" },
      { name: "description", content: "ألعاب تعليمية تفاعلية للأطفال 5–12 سنة: رياضيات، علوم، قراءة، تربية إسلامية. اجمع النقاط والشارات واربح الشهادات." },
      { property: "og:title", content: "الألعاب التعليمية للأطفال — معلوم" },
      { property: "og:description", content: "تعلّم وأنت تلعب مع منصة معلوم." },
    ],
  }),
  component: PlayHome,
});

function PlayHome() {
  const { progress, guest, isAuthed } = useGameProgress();
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [featured, setFeatured] = useState<PlayGame[]>([]);
  const [newest, setNewest] = useState<PlayGame[]>([]);
  const [level, setLevel] = useState<GameLevel | null>(null);
  const [nextLevel, setNextLevel] = useState<GameLevel | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  const xp = isAuthed ? progress?.xp || 0 : guest.xp;
  const coins = isAuthed ? progress?.coins || 0 : guest.coins;
  const stars = isAuthed ? progress?.stars || 0 : guest.stars;

  useEffect(() => {
    (async () => {
      const [cats, feat, latest, levels, dc] = await Promise.all([
        supabase.from("game_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("play_games").select("*").eq("is_published", true).eq("is_featured", true).limit(6),
        supabase.from("play_games").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(6),
        supabase.from("game_levels").select("*").order("level_number"),
        supabase.from("daily_game_challenges").select("*, play_games(*)").eq("challenge_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
      ]);
      setCategories(cats.data || []);
      setFeatured(feat.data || []);
      setNewest(latest.data || []);
      const lvls = levels.data || [];
      const curLevelNum = isAuthed ? progress?.current_level || 1 : 1;
      setLevel(lvls.find((l) => l.level_number === curLevelNum) || lvls[0] || null);
      setNextLevel(lvls.find((l) => l.level_number === curLevelNum + 1) || null);
      setDailyChallenge((dc.data as DailyChallenge | null) ?? null);
      setLoading(false);
    })();
  }, [isAuthed, progress?.current_level]);

  const xpForNext = nextLevel ? nextLevel.min_xp : xp;
  const xpForCur = level?.min_xp || 0;
  const progressPct = nextLevel
    ? Math.min(100, Math.round(((xp - xpForCur) / Math.max(xpForNext - xpForCur, 1)) * 100))
    : 100;

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-6 sm:p-10 mb-6 sm:mb-8 text-primary-foreground">
          <div className="absolute -top-10 -right-10 text-9xl opacity-10">🎮</div>
          <div className="absolute -bottom-6 -left-6 text-7xl opacity-10">⭐</div>
          <div className="relative">
            <h1 className="text-3xl sm:text-5xl font-black mb-2">مرحباً في عالم الألعاب! 🎉</h1>
            <p className="text-base sm:text-lg opacity-90 mb-5 max-w-xl">
              تعلّم وأنت تلعب — اجمع النقاط، اربح الشارات، واصعد المستويات
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/play/leaderboard"
                className="bg-white/20 backdrop-blur hover:bg-white/30 px-5 py-2.5 rounded-2xl font-bold text-sm"
              >
                🏆 المتصدرون
              </Link>
              {featured[0] && (
                <Link
                  to="/play/$gameId"
                  params={{ gameId: featured[0].id }}
                  className="bg-white text-primary hover:bg-white/90 px-5 py-2.5 rounded-2xl font-bold text-sm"
                >
                  ▶ ابدأ اللعب
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={level?.icon || "⭐"} label={level?.name_ar || "مستكشف صغير"} value={`المستوى ${level?.level_number || 1}`} color="from-primary/20 to-primary/5" />
          <StatCard icon="✨" label="نقاط XP" value={xp.toString()} color="from-blue-500/20 to-blue-500/5" />
          <StatCard icon="💰" label="عملات" value={coins.toString()} color="from-yellow-500/20 to-yellow-500/5" />
          <StatCard icon="⭐" label="نجوم" value={stars.toString()} color="from-purple-500/20 to-purple-500/5" />
        </div>

        {nextLevel && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-8">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">التقدم نحو {nextLevel.name_ar} {nextLevel.icon}</span>
              <span className="text-muted-foreground">{xp} / {nextLevel.min_xp} XP</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {/* Daily challenge */}
        {dailyChallenge && (
          <div className="bg-gradient-to-br from-accent/20 to-primary/10 border-2 border-accent/30 rounded-3xl p-5 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🎯</span>
              <div>
                <div className="text-xs font-bold text-accent uppercase">تحدي اليوم</div>
                <h3 className="text-xl font-bold text-foreground">{dailyChallenge.title}</h3>
              </div>
            </div>
            {dailyChallenge.description && (
              <p className="text-sm text-muted-foreground mb-3">{dailyChallenge.description}</p>
            )}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">+{dailyChallenge.bonus_xp} XP</span>
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full font-bold mr-2">+{dailyChallenge.bonus_coins} 💰</span>
              </div>
              {dailyChallenge.game_id && (
                <Link
                  to="/play/$gameId"
                  params={{ gameId: dailyChallenge.game_id }}
                  className="bg-accent text-accent-foreground px-5 py-2 rounded-xl font-bold text-sm"
                >
                  ابدأ التحدي
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-4">التصنيفات</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/play/category/$slug"
                params={{ slug: c.slug }}
                className="group relative overflow-hidden rounded-3xl p-5 text-center border-2 border-transparent hover:border-primary hover:shadow-lg transition-all"
                style={{ background: `linear-gradient(135deg, ${c.color}20, ${c.color}05)` }}
              >
                <div className="text-5xl sm:text-6xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</div>
                <div className="font-bold text-foreground text-sm sm:text-base">{c.name_ar}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">🌟 ألعاب مميزة</h2>
            <GameGrid games={featured} categories={categories} />
          </section>
        )}

        {/* Newest */}
        {newest.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">🆕 أحدث الألعاب</h2>
            <GameGrid games={newest} categories={categories} />
          </section>
        )}

        {loading && (
          <div className="text-center text-muted-foreground py-6">جارٍ التحميل...</div>
        )}

        {!loading && featured.length === 0 && newest.length === 0 && (
          <div className="text-center py-16 bg-muted/30 rounded-3xl">
            <div className="text-6xl mb-3">🎮</div>
            <p className="text-muted-foreground">لا توجد ألعاب منشورة بعد. سيتم إضافتها قريباً!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-border rounded-2xl p-4 text-center`}>
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function GameGrid({ games, categories }: { games: PlayGame[]; categories: GameCategory[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {games.map((g) => {
        const cat = categories.find((c) => c.id === g.category_id);
        return (
          <Link
            key={g.id}
            to="/play/$gameId"
            params={{ gameId: g.id }}
            className="group bg-card border-2 border-border rounded-3xl overflow-hidden hover:border-primary hover:shadow-lg transition-all"
          >
            <div
              className="aspect-square flex items-center justify-center text-6xl relative"
              style={{ background: cat ? `linear-gradient(135deg, ${cat.color}30, ${cat.color}10)` : undefined }}
            >
              {g.cover_url ? <img src={g.cover_url} alt="" className="w-full h-full object-cover" /> : <span className="group-hover:scale-110 transition-transform">{cat?.icon || "🎯"}</span>}
              {g.is_new && (
                <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">جديد</span>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-bold text-foreground text-sm line-clamp-1 mb-1">{g.title}</h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{cat?.name_ar || ""}</span>
                <span className="text-primary font-bold">+{g.xp_reward} XP</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
