import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayGame, GameCategory } from "@/lib/gameTypes";

export const Route = createFileRoute("/play/category/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [category, setCategory] = useState<GameCategory | null>(null);
  const [games, setGames] = useState<PlayGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase
        .from("game_categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setCategory(cat);
      if (cat) {
        const { data } = await supabase
          .from("play_games")
          .select("*")
          .eq("category_id", cat.id)
          .eq("is_published", true)
          .order("sort_order");
        setGames(data || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/play" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← الألعاب</Link>
        {category && (
          <div className="text-center mb-8">
            <div className="text-7xl mb-2">{category.icon}</div>
            <h1 className="text-3xl font-bold text-foreground">{category.name_ar}</h1>
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-3xl">
            <div className="text-5xl mb-3">🎮</div>
            <p className="text-muted-foreground">لا توجد ألعاب في هذا التصنيف بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {games.map((g) => (
              <Link
                key={g.id}
                to="/play/$gameId"
                params={{ gameId: g.id }}
                className="group bg-card border-2 border-border rounded-3xl overflow-hidden hover:border-primary hover:shadow-lg transition-all"
              >
                <div
                  className="aspect-square flex items-center justify-center text-6xl"
                  style={{ background: category ? `linear-gradient(135deg, ${category.color}30, ${category.color}10)` : undefined }}
                >
                  {g.cover_url ? <img src={g.cover_url} alt="" className="w-full h-full object-cover" /> : <span className="group-hover:scale-110 transition-transform">{category?.icon}</span>}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-foreground text-sm line-clamp-1 mb-1">{g.title}</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {g.difficulty === "easy" ? "سهل" : g.difficulty === "hard" ? "صعب" : "متوسط"}
                    </span>
                    <span className="text-primary font-bold">+{g.xp_reward} XP</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
