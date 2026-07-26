import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/quizzes/")({
  head: () => ({
    meta: [
      { title: "اختبارات تفاعلية — معلوم" },
      { name: "description", content: "اختبر معلوماتك مع مجموعة اختبارات تفاعلية في مختلف المواد على منصة معلوم." },
      { property: "og:title", content: "اختبارات تفاعلية — معلوم" },
      { property: "og:description", content: "اختبر معلوماتك مع مجموعة اختبارات تفاعلية في مختلف المواد." },
    ],
  }),
  component: QuizzesIndex,
});

type Quiz = Tables<"html_quizzes">;

const CATEGORIES: Record<string, string> = {
  general: "عام",
  math: "رياضيات",
  science: "علوم",
  language: "لغات",
  programming: "برمجة",
  history: "تاريخ",
  religion: "تربية إسلامية",
};

const DIFF_LABEL: Record<string, { label: string; emoji: string; cls: string }> = {
  easy: { label: "سهل", emoji: "🟢", cls: "bg-green-100 text-green-700" },
  medium: { label: "متوسط", emoji: "🟡", cls: "bg-yellow-100 text-yellow-700" },
  hard: { label: "صعب", emoji: "🔴", cls: "bg-red-100 text-red-700" },
};

function QuizzesIndex() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("html_quizzes")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setQuizzes(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return quizzes.filter((q) => {
      const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
        (q.description || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "all" || q.category === category;
      const matchDiff = difficulty === "all" || q.difficulty === difficulty;
      return matchSearch && matchCat && matchDiff;
    });
  }, [quizzes, search, category, difficulty]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    quizzes.forEach((q) => { counts[q.category] = (counts[q.category] || 0) + 1; });
    return counts;
  }, [quizzes]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-border">
        <div className="container py-12 md:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              📝 اختبارات تفاعلية
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              اختبر معلوماتك واكتشف مستواك
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              مجموعة متنوعة من الاختبارات التفاعلية في مختلف المواد، مصممة لتقييم فهمك وتعزيز تعلمك.
            </p>
            <div className="mt-6 flex justify-center gap-6 text-sm">
              <div>
                <div className="text-2xl font-bold text-primary">{quizzes.length}</div>
                <div className="text-xs text-muted-foreground">اختبار</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{Object.keys(categoryCounts).length}</div>
                <div className="text-xs text-muted-foreground">تصنيف</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-8 space-y-6">
        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن اختبار..."
                className="w-full pe-10 ps-4 py-2.5 rounded-lg border border-input bg-background"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
            >
              <option value="all">كل المستويات</option>
              <option value="easy">🟢 سهل</option>
              <option value="medium">🟡 متوسط</option>
              <option value="hard">🔴 صعب</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              الكل ({quizzes.length})
            </button>
            {Object.entries(CATEGORIES).map(([key, label]) => {
              const count = categoryCounts[key] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center bg-card border border-border rounded-2xl p-12">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-muted-foreground">
              {quizzes.length === 0 ? "لا توجد اختبارات منشورة بعد" : "لا توجد نتائج لبحثك"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((q) => {
              const diff = DIFF_LABEL[q.difficulty] || DIFF_LABEL.medium;
              return (
                <Link
                  key={q.id}
                  to="/quizzes/$quizId"
                  params={{ quizId: q.id }}
                  className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="relative h-36 bg-gradient-to-br from-primary/20 to-accent/10 overflow-hidden">
                    {q.image_url ? (
                      <img src={q.image_url} alt={q.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl opacity-40">📝</div>
                    )}
                    <span className={`absolute top-2 end-2 text-xs px-2 py-0.5 rounded-full font-medium ${diff.cls}`}>
                      {diff.emoji} {diff.label}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{q.title}</h3>
                    {q.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{q.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                      <span className="text-muted-foreground">
                        {CATEGORIES[q.category] || q.category}
                      </span>
                      <span className="text-muted-foreground">⏱ {q.estimated_minutes} د</span>
                    </div>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                        ابدأ الاختبار ←
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
