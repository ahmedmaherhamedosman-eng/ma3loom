import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/games/")({
  head: () => ({
    meta: [
      { title: "الألعاب التعليمية — معلوم" },
      { name: "description", content: "ألعاب تفاعلية ممتعة لتعلّم الرياضيات والعلوم واللغات والبرمجة." },
    ],
  }),
  component: GamesPage,
});

type Game = Tables<"educational_games">;

const CATEGORY_LABELS: Record<string, string> = {
  math: "رياضيات", science: "علوم", language: "لغات", programming: "برمجة", general: "عام",
};

const CATEGORY_ICONS: Record<string, string> = {
  math: "🔢", science: "🔬", language: "📖", programming: "💻", general: "🎯",
};

function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      const { data } = await supabase
        .from("educational_games")
        .select("*")
        .eq("is_published", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      setGames(data || []);
      setLoading(false);
    })();
  }, []);

  if (authed === false) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center bg-card rounded-2xl border border-border p-8 max-w-md">
          <div className="text-5xl mb-3">🎮</div>
          <h1 className="text-xl font-bold text-foreground mb-2">الألعاب التعليمية</h1>
          <p className="text-muted-foreground text-sm mb-6">
            سجّل دخولك للوصول إلى الألعاب التفاعلية الممتعة
          </p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  const categories = Array.from(new Set(games.map((g) => g.category)));
  const filtered = filter === "all" ? games : games.filter((g) => g.category === filter);

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎮</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">الألعاب التعليمية</h1>
          <p className="text-muted-foreground">تعلّم وأنت تلعب — ألعاب تفاعلية لكل المواد</p>
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {CATEGORY_ICONS[c] || "🎯"} {CATEGORY_LABELS[c] || c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <div className="text-5xl mb-3">🎮</div>
            <p>لا توجد ألعاب متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((g) => (
              <Link
                key={g.id}
                to="/games/$gameId"
                params={{ gameId: g.id }}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary hover:shadow-lg transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-5xl relative overflow-hidden">
                  {g.image_url ? (
                    <img src={g.image_url} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <span>{CATEGORY_ICONS[g.category] || "🎮"}</span>
                  )}
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {CATEGORY_LABELS[g.category] || g.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {g.title}
                  </h3>
                  {g.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
