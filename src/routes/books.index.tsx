import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/books/")({
  head: () => ({
    meta: [
      { title: "الكتب الإلكترونية — معلوم" },
      { name: "description", content: "مكتبة كتب إلكترونية مجانية ومدفوعة بصيغة PDF لكل المراحل الدراسية." },
      { property: "og:title", content: "الكتب الإلكترونية — معلوم" },
      { property: "og:description", content: "حمّل كتبك الدراسية والملخصات بصيغة PDF — مجاني ومدفوع." },
    ],
  }),
  component: BooksPage,
});

type Book = Tables<"books">;

const LEVEL_LABELS: Record<string, string> = {
  "ابتدائي": "🎒 ابتدائي",
  "إعدادي": "📘 إعدادي",
  "ثانوي": "📗 ثانوي",
  "جامعي": "🎓 جامعي",
  "عام": "📚 عام",
};

function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("is_published", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      setBooks(data || []);
      setLoading(false);
    })();
  }, []);

  const levels = Array.from(new Set(books.map((b) => b.education_level)));
  let filtered = filter === "all" ? books : books.filter((b) => b.education_level === filter);
  if (priceFilter === "free") filtered = filtered.filter((b) => b.is_free);
  if (priceFilter === "paid") filtered = filtered.filter((b) => !b.is_free);

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">المكتبة الإلكترونية</h1>
          <p className="text-muted-foreground">كتب وملخصات PDF لكل المراحل — مجاني ومدفوع</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <button
            onClick={() => setPriceFilter("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              priceFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setPriceFilter("free")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              priceFilter === "free" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            🆓 مجاني
          </button>
          <button
            onClick={() => setPriceFilter("paid")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              priceFilter === "paid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            💎 مدفوع
          </button>
        </div>

        {levels.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              كل المراحل
            </button>
            {levels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === lvl ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {LEVEL_LABELS[lvl] || lvl}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <div className="text-5xl mb-3">📖</div>
            <p>لا توجد كتب متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((b) => (
              <Link
                key={b.id}
                to="/books/$bookId"
                params={{ bookId: b.id }}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary hover:shadow-lg transition-all flex flex-col"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 to-warm/10 flex items-center justify-center text-6xl relative overflow-hidden">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <span>📕</span>
                  )}
                  <div className="absolute top-2 end-2">
                    {b.is_free ? (
                      <span className="text-[10px] font-bold bg-emerald-500 text-white rounded-full px-2 py-0.5">مجاني</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-warm text-warm-foreground rounded-full px-2 py-0.5">{b.price} ر.س</span>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-1 flex-1 flex flex-col">
                  <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2">
                    {b.title}
                  </h3>
                  {b.author && <p className="text-xs text-muted-foreground line-clamp-1">✍️ {b.author}</p>}
                  <div className="flex items-center justify-between pt-1 mt-auto text-[10px] text-muted-foreground">
                    <span>{LEVEL_LABELS[b.education_level] || b.education_level}</span>
                    {b.pages_count > 0 && <span>{b.pages_count} ص</span>}
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
