import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "إدارة التقييمات — معلوم" }] }),
  component: AdminReviews,
});

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  course_id: string;
  course_title?: string;
  author_name?: string;
}

function AdminReviews() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStars, setFilterStars] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data: reviews } = await supabase
      .from("course_reviews")
      .select("id, rating, comment, created_at, user_id, course_id")
      .order("created_at", { ascending: false });

    if (!reviews) { setRows([]); setLoading(false); return; }

    const courseIds = Array.from(new Set(reviews.map((r) => r.course_id)));
    const userIds = Array.from(new Set(reviews.map((r) => r.user_id)));

    const [coursesRes, profilesRes] = await Promise.all([
      courseIds.length
        ? supabase.from("courses").select("id, title").in("id", courseIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const courseMap = Object.fromEntries((coursesRes.data || []).map((c: any) => [c.id, c.title]));
    const nameMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.user_id, p.full_name]));

    setRows(
      reviews.map((r) => ({
        ...r,
        course_title: courseMap[r.course_id] || "—",
        author_name: nameMap[r.user_id] || "طالب",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا التقييم نهائياً؟")) return;
    const { error } = await supabase.from("course_reviews").delete().eq("id", id);
    if (error) {
      toast.error("فشل الحذف", { description: error.message });
      return;
    }
    toast.success("تم حذف التقييم");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => { if (r.course_title) map.set(r.course_id, r.course_title); });
    return Array.from(map.entries());
  }, [rows]);

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.author_name?.includes(search) ||
      r.course_title?.includes(search) ||
      r.comment?.includes(search);
    const matchStars = filterStars === "all" || r.rating === Number(filterStars);
    const matchCourse = filterCourse === "all" || r.course_id === filterCourse;
    return matchSearch && matchStars && matchCourse;
  });

  const avg = rows.length > 0 ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">إدارة التقييمات</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">إجمالي التقييمات</div>
          <div className="text-2xl font-bold text-foreground">{rows.length}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">متوسط النجوم</div>
          <div className="text-2xl font-bold text-warm-foreground">{avg.toFixed(1)} ⭐</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">5 نجوم</div>
          <div className="text-2xl font-bold text-success">{rows.filter((r) => r.rating === 5).length}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">≤ 2 نجوم</div>
          <div className="text-2xl font-bold text-destructive">{rows.filter((r) => r.rating <= 2).length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="بحث في التعليقات أو أسماء الطلاب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterStars}
          onChange={(e) => setFilterStars(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:w-40"
        >
          <option value="all">كل النجوم</option>
          <option value="5">5 نجوم</option>
          <option value="4">4 نجوم</option>
          <option value="3">3 نجوم</option>
          <option value="2">2 نجوم</option>
          <option value="1">1 نجمة</option>
        </select>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:w-56"
        >
          <option value="all">كل الكورسات</option>
          {courses.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-medium text-muted-foreground">الطالب</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الكورس</th>
                <th className="text-right p-3 font-medium text-muted-foreground">التقييم</th>
                <th className="text-right p-3 font-medium text-muted-foreground">التعليق</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">التاريخ</th>
                <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد تقييمات</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30 align-top">
                    <td className="p-3 font-medium text-foreground whitespace-nowrap">{r.author_name}</td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate">{r.course_title}</td>
                    <td className="p-3"><StarRating value={r.rating} size="sm" readOnly /></td>
                    <td className="p-3 text-foreground max-w-md">
                      {r.comment ? <p className="line-clamp-3 text-xs">{r.comment}</p> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="text-destructive">🗑️</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
