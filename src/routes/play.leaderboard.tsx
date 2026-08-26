import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/play/leaderboard")({
  head: () => ({
    meta: [
      { title: "لوحة المتصدرين — معلوم" },
      { name: "description", content: "أفضل الطلاب في الألعاب التعليمية على منصة معلوم." },
    ],
  }),
  component: Leaderboard,
});

interface Row {
  user_id: string;
  xp: number;
  coins: number;
  stars: number;
  current_level: number;
  full_name?: string | null;
  country?: string | null;
}

function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: progress } = await supabase
        .from("user_game_progress")
        .select("user_id, xp, coins, stars, current_level")
        .order("xp", { ascending: false })
        .limit(100);
      if (progress && progress.length > 0) {
        const ids = progress.map((p) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, country")
          .in("user_id", ids);
        const map = new Map((profiles || []).map((p) => [p.user_id, p]));
        setRows(
          progress.map((p) => ({
            ...p,
            full_name: map.get(p.user_id)?.full_name,
            country: map.get(p.user_id)?.country,
          }))
        );
      }
      setLoading(false);
    })();
  }, []);

  const countries = Array.from(new Set(rows.map((r) => r.country).filter(Boolean))) as string[];
  const filtered = countryFilter === "all" ? rows : rows.filter((r) => r.country === countryFilter);

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/play" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← الألعاب</Link>
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🏆</div>
          <h1 className="text-3xl font-bold text-foreground">لوحة المتصدرين</h1>
          <p className="text-muted-foreground text-sm">أفضل اللاعبين على منصة معلوم</p>
        </div>

        {countries.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={() => setCountryFilter("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${countryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              الكل
            </button>
            {countries.map((c) => (
              <button
                key={c}
                onClick={() => setCountryFilter(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium ${countryFilter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-12">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-3xl">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-muted-foreground">لا يوجد لاعبون بعد. كن أول من يصعد للقائمة!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {filtered.slice(0, 3).map((r, i) => {
                const rank = i + 1;
                return (
                  <div key={r.user_id} className={`bg-card border rounded-3xl p-5 text-center ${rank === 1 ? "border-yellow-400 shadow-lg sm:-translate-y-2" : "border-border"}`}>
                    <div className="text-4xl mb-2">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</div>
                    <div className="font-bold text-foreground truncate">{r.full_name || "طالب"}</div>
                    <div className="text-xs text-muted-foreground mt-1">المستوى {r.current_level}</div>
                    <div className="text-xl font-black text-primary mt-3">{r.xp} XP</div>
                  </div>
                );
              })}
            </div>
            {filtered.length > 3 && <div className="bg-card border border-border rounded-3xl overflow-hidden">
              {filtered.slice(3).map((r, i) => {
              const rank = i + 4;
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
              return (
                <div
                  key={r.user_id}
                  className={`flex items-center gap-3 p-4 border-b border-border last:border-0 ${rank <= 3 ? "bg-gradient-to-l from-primary/5 to-transparent" : ""}`}
                >
                  <div className="text-2xl w-12 text-center font-bold">{medal}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground truncate">{r.full_name || "طالب"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.country && `${r.country} • `}المستوى {r.current_level}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-primary">{r.xp} XP</div>
                    <div className="text-xs text-muted-foreground">⭐ {r.stars} • 💰 {r.coins}</div>
                  </div>
                </div>
              );
            })}
            </div>}
          </>
        )}
      </div>
    </div>
  );
}
