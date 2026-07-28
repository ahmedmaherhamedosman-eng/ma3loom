import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "لوحة التحكم — معلوم" }],
  }),
  component: AdminDashboard,
});

interface Stats {
  students: number;
  courses: number;
  lessons: number;
  posts: number;
  certificates: number;
  revenue: number;
  revenueThisMonth: number;
  activeThisWeek: number;
  enrollments: number;
  avgCompletion: number;
}

interface TopCourse {
  id: string;
  title: string;
  count: number;
}

interface TopRated {
  id: string;
  title: string;
  rating_avg: number;
  rating_count: number;
}

interface DailyPoint {
  date: string;
  count: number;
}

interface WeekProgressRow {
  user_id: string;
}

interface EnrollmentRow {
  progress_percentage: number | null;
  course_id: string | null;
}

interface CoursePaymentRow {
  course_id: string | null;
}

interface CourseTitleRow {
  id: string;
  title: string;
}

interface RecentEnrollmentRow {
  enrolled_at: string;
}

function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    students: 0,
    courses: 0,
    lessons: 0,
    posts: 0,
    certificates: 0,
    revenue: 0,
    revenueThisMonth: 0,
    activeThisWeek: 0,
    enrollments: 0,
    avgCompletion: 0,
  });
  const [topSelling, setTopSelling] = useState<TopCourse[]>([]);
  const [topRated, setTopRated] = useState<TopRated[]>([]);
  const [chart, setChart] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        { count: students },
        { count: courses },
        { count: lessons },
        { count: posts },
        { count: certificates },
        { data: payments },
        { data: monthPayments },
        { data: weekProgress },
        { data: enrollments },
        { data: enrollPayments },
        { data: topRatedRows },
        { data: recentEnrolls },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("lessons").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("certificates").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount").eq("status", "completed"),
        supabase.from("payments").select("amount").eq("status", "completed").gte("created_at", monthStart),
        supabase.from("lesson_progress").select("user_id").gte("last_watched_at", weekAgo),
        supabase.from("enrollments").select("progress_percentage, course_id"),
        supabase.from("payments").select("course_id").eq("status", "completed"),
        supabase.from("courses")
          .select("id, title, rating_avg, rating_count")
          .gt("rating_count", 0)
          .order("rating_avg", { ascending: false })
          .limit(5),
        supabase.from("enrollments").select("enrolled_at").gte("enrolled_at", thirtyDaysAgo.toISOString()),
      ]);

      const revenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const revenueThisMonth = monthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const activeThisWeek = new Set((((weekProgress as WeekProgressRow[] | null) || []).map((p) => p.user_id))).size;

      const enrollList = (enrollments as EnrollmentRow[] | null) || [];
      const avgCompletion = enrollList.length > 0
        ? Math.round(enrollList.reduce((a: number, e) => a + (e.progress_percentage || 0), 0) / enrollList.length)
        : 0;

      // Top selling: count payments per course_id
      const sellMap: Record<string, number> = {};
      (((enrollPayments as CoursePaymentRow[] | null) || [])).forEach((p) => {
        if (!p.course_id) return;
        sellMap[p.course_id] = (sellMap[p.course_id] || 0) + 1;
      });
      const topSellingIds = Object.entries(sellMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      let topSellingList: TopCourse[] = [];
      if (topSellingIds.length > 0) {
        const { data: courseTitles } = await supabase
          .from("courses")
          .select("id, title")
          .in("id", topSellingIds.map(([id]) => id));
        const titleMap = Object.fromEntries((((courseTitles as CourseTitleRow[] | null) || []).map((c) => [c.id, c.title])));
        topSellingList = topSellingIds.map(([id, count]) => ({
          id,
          title: titleMap[id] || "—",
          count,
        }));
      }

      // Build 30-day enrollment chart
      const dayMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        dayMap[key] = 0;
      }
      (((recentEnrolls as RecentEnrollmentRow[] | null) || [])).forEach((e) => {
        const key = e.enrolled_at.slice(0, 10);
        if (key in dayMap) dayMap[key]++;
      });
      const chartData: DailyPoint[] = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

      setStats({
        students: students || 0,
        courses: courses || 0,
        lessons: lessons || 0,
        posts: posts || 0,
        certificates: certificates || 0,
        revenue,
        revenueThisMonth,
        activeThisWeek,
        enrollments: enrollList.length,
        avgCompletion,
      });
      setTopSelling(topSellingList);
      setTopRated((topRatedRows || []) as TopRated[]);
      setChart(chartData);
      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "إجمالي الطلاب", value: stats.students, icon: "👨‍🎓", color: "bg-primary/10 text-primary" },
    { label: "نشط هذا الأسبوع", value: stats.activeThisWeek, icon: "⚡", color: "bg-success/10 text-success" },
    { label: "الكورسات", value: stats.courses, icon: "📚", color: "bg-warm/10 text-warm-foreground" },
    { label: "الدروس", value: stats.lessons, icon: "🎬", color: "bg-chart-2/10 text-foreground" },
    { label: "إجمالي التسجيلات", value: stats.enrollments, icon: "✍️", color: "bg-chart-4/10 text-foreground" },
    { label: "متوسط الإكمال", value: `${stats.avgCompletion}%`, icon: "📈", color: "bg-chart-5/10 text-foreground" },
    { label: "الشهادات", value: stats.certificates, icon: "🏆", color: "bg-accent/15 text-accent-foreground" },
    { label: "المنشورات", value: stats.posts, icon: "📝", color: "bg-chart-3/10 text-foreground" },
  ];

  const maxChart = Math.max(1, ...chart.map((c) => c.count));

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-2">لوحة التحكم</h1>
      <p className="text-sm text-muted-foreground mb-6">نظرة شاملة على أداء المنصة</p>

      {/* Revenue */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl border border-success/20 p-5">
          <div className="text-xs text-muted-foreground mb-1">💰 إجمالي الإيرادات</div>
          <div className="text-3xl font-extrabold text-success" dir="ltr">
            ${loading ? "..." : stats.revenue.toFixed(2)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5">
          <div className="text-xs text-muted-foreground mb-1">📅 إيرادات الشهر الحالي</div>
          <div className="text-3xl font-extrabold text-primary" dir="ltr">
            ${loading ? "..." : stats.revenueThisMonth.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${s.color}`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground truncate">
                {loading ? "..." : typeof s.value === "number" ? s.value.toLocaleString("ar-EG") : s.value}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-6">
        <h2 className="text-lg font-bold text-foreground mb-4">📊 التسجيلات خلال آخر 30 يوم</h2>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">جاري التحميل...</div>
        ) : (
          <div className="flex items-end gap-1 h-40" dir="ltr">
            {chart.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${d.count} تسجيل`}>
                <div className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition">
                  {d.count}
                </div>
                <div
                  className="w-full bg-primary/70 hover:bg-primary rounded-t transition-all"
                  style={{ height: `${(d.count / maxChart) * 100}%`, minHeight: d.count > 0 ? "4px" : "1px" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top courses */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-lg font-bold text-foreground mb-4">🔥 الأكثر مبيعاً</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : topSelling.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مبيعات بعد</p>
          ) : (
            <ul className="space-y-2">
              {topSelling.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <span className="w-6 h-6 rounded-full bg-warm/15 text-warm-foreground flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <Link to="/courses/$courseId" params={{ courseId: c.id }} className="flex-1 text-sm text-foreground hover:text-primary truncate">
                    {c.title}
                  </Link>
                  <span className="text-xs font-bold text-success">{c.count} مبيعة</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h2 className="text-lg font-bold text-foreground mb-4">⭐ الأعلى تقييماً</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          ) : topRated.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تقييمات بعد</p>
          ) : (
            <ul className="space-y-2">
              {topRated.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <span className="w-6 h-6 rounded-full bg-warm/15 text-warm-foreground flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <Link to="/courses/$courseId" params={{ courseId: c.id }} className="flex-1 text-sm text-foreground hover:text-primary truncate">
                    {c.title}
                  </Link>
                  <span className="text-xs font-bold text-warm-foreground">
                    {Number(c.rating_avg).toFixed(1)} ⭐ ({c.rating_count})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
