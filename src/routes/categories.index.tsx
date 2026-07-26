import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "تصنيفات الكورسات — معلوم" },
      { name: "description", content: "تصفح كل تصنيفات الكورسات على منصة معلوم: برمجة، رياضيات، علوم، لغات والمزيد." },
    ],
  }),
  component: CategoriesIndex,
});

type Category = Tables<"categories">;

function CategoriesIndex() {
  const [items, setItems] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: links }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("course_categories").select("category_id"),
      ]);
      setItems(cats || []);
      const map: Record<string, number> = {};
      (links || []).forEach((r) => { map[r.category_id] = (map[r.category_id] || 0) + 1; });
      setCounts(map);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">تصنيفات الكورسات</h1>
          <p className="text-muted-foreground">اختر التصنيف الذي يهمك واستكشف الكورسات المتاحة</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد تصنيفات بعد.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((c) => (
              <Link
                key={c.id}
                to="/categories/$slug"
                params={{ slug: c.slug }}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    {c.icon || "📁"}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{c.name}</h2>
                    <p className="text-xs text-muted-foreground">{counts[c.id] || 0} كورس</p>
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
