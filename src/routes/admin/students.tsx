import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/admin/students")({
  head: () => ({ meta: [{ title: "إدارة الطلاب — معلوم" }] }),
  component: AdminStudents,
});

interface EnrollmentDetail {
  course_id: string;
  course_title: string;
  progress_percentage: number;
  completed: boolean;
  enrolled_at: string;
  last_lesson_id: string | null;
  last_lesson_title?: string;
}

interface Student {
  id: string;
  user_id: string;
  full_name: string;
  education_level: string | null;
  user_type: string;
  age: number | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  enrollmentCount: number;
  enrolledCourses: EnrollmentDetail[];
  totalPaid: number;
  avgProgress: number;
  lastActivity: string | null;
}

interface EnrollmentRow {
  user_id: string;
  course_id: string;
  progress_percentage: number | null;
  completed: boolean | null;
  enrolled_at: string;
  last_lesson_id: string | null;
  courses: { title: string } | null;
}

interface LessonRow {
  id: string;
  title: string;
}

interface ProgressRow {
  user_id: string;
  last_watched_at: string;
}

interface PaymentRow {
  user_id: string;
  amount: number | null;
}

const userTypeLabel: Record<string, string> = {
  student: "طالب",
  teacher: "معلم",
  parent: "ولي أمر",
};

const userTypeColor: Record<string, string> = {
  student: "bg-primary/10 text-primary",
  teacher: "bg-accent/20 text-accent-foreground",
  parent: "bg-success/10 text-success",
};

function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterActivity, setFilterActivity] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Student | null>(null);
  const [allCourses, setAllCourses] = useState<{ id: string; title: string }[]>([]);

  const load = async () => {
    setLoading(true);
    const [profilesRes, enrollRes, paymentsRes, lessonsRes, progressRes, coursesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, full_name, education_level, user_type, age, phone, avatar_url, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("enrollments")
        .select("user_id, course_id, progress_percentage, completed, enrolled_at, last_lesson_id, courses(title)"),
      supabase
        .from("payments")
        .select("user_id, amount")
        .eq("status", "completed"),
      supabase.from("lessons").select("id, title"),
      supabase.from("lesson_progress").select("user_id, last_watched_at"),
      supabase.from("courses").select("id, title").order("title"),
    ]);

    const profiles = profilesRes.data || [];
    const enrollments = (enrollRes.data || []) as EnrollmentRow[];
    const payments = paymentsRes.data || [];
    const lessons = (lessonsRes.data || []) as LessonRow[];
    const progress = (progressRes.data || []) as ProgressRow[];

    const lessonTitleMap = Object.fromEntries(lessons.map((l) => [l.id, l.title]));

    const enrollMap: Record<string, EnrollmentDetail[]> = {};
    enrollments.forEach((e) => {
      if (!enrollMap[e.user_id]) enrollMap[e.user_id] = [];
      enrollMap[e.user_id].push({
        course_id: e.course_id,
        course_title: e.courses?.title || "كورس محذوف",
        progress_percentage: e.progress_percentage || 0,
        completed: !!e.completed,
        enrolled_at: e.enrolled_at,
        last_lesson_id: e.last_lesson_id,
        last_lesson_title: e.last_lesson_id ? lessonTitleMap[e.last_lesson_id] : undefined,
      });
    });

    const paidMap: Record<string, number> = {};
    (payments as PaymentRow[]).forEach((p) => {
      paidMap[p.user_id] = (paidMap[p.user_id] || 0) + Number(p.amount || 0);
    });

    const lastActivityMap: Record<string, string> = {};
    progress.forEach((p) => {
      const t = p.last_watched_at;
      if (!lastActivityMap[p.user_id] || t > lastActivityMap[p.user_id]) {
        lastActivityMap[p.user_id] = t;
      }
    });

    setStudents(
      profiles.map((p) => {
        const enrolls = enrollMap[p.user_id] || [];
        const avgProgress =
          enrolls.length > 0
            ? Math.round(enrolls.reduce((a, e) => a + e.progress_percentage, 0) / enrolls.length)
            : 0;
        return {
          ...p,
          enrollmentCount: enrolls.length,
          enrolledCourses: enrolls,
          totalPaid: paidMap[p.user_id] || 0,
          avgProgress,
          lastActivity: lastActivityMap[p.user_id] || null,
        };
      })
    );
    setAllCourses((coursesRes.data || []) as { id: string; title: string }[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (s: Student) => {
    if (!confirm(`هل أنت متأكد من حذف "${s.full_name}"؟ سيتم حذف الحساب وكل بياناته نهائياً. لا يمكن التراجع.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { targetUserId: s.user_id },
    });
    if (error || !data?.success) {
      alert("حدث خطأ أثناء الحذف: " + (error?.message || data?.error || "خطأ غير معروف"));
      return;
    }
    setSelected(null);
    load();
  };

  const filtered = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return students.filter((s) => {
      const matchSearch =
        !search ||
        s.full_name.includes(search) ||
        s.education_level?.includes(search) ||
        s.phone?.includes(search);
      const matchType = filterType === "all" || s.user_type === filterType;
      const matchActivity =
        filterActivity === "all" ||
        (filterActivity === "active" && s.lastActivity && new Date(s.lastActivity).getTime() > weekAgo) ||
        (filterActivity === "inactive" && (!s.lastActivity || new Date(s.lastActivity).getTime() <= weekAgo));
      const matchCourse =
        filterCourse === "all" || s.enrolledCourses.some((e) => e.course_id === filterCourse);
      return matchSearch && matchType && matchActivity && matchCourse;
    });
  }, [students, search, filterType, filterActivity, filterCourse]);

  const stats = {
    total: students.length,
    students: students.filter((s) => s.user_type === "student").length,
    teachers: students.filter((s) => s.user_type === "teacher").length,
    parents: students.filter((s) => s.user_type === "parent").length,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">إدارة المستخدمين</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">إجمالي</div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">طلاب</div>
          <div className="text-2xl font-bold text-primary">{stats.students}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">معلمون</div>
          <div className="text-2xl font-bold text-accent-foreground">{stats.teachers}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">أولياء أمور</div>
          <div className="text-2xl font-bold text-success">{stats.parents}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="بحث بالاسم، المرحلة، أو رقم الجوال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:w-40"
        >
          <option value="all">كل الأنواع</option>
          <option value="student">طلاب</option>
          <option value="teacher">معلمون</option>
          <option value="parent">أولياء أمور</option>
        </select>
        <select
          value={filterActivity}
          onChange={(e) => setFilterActivity(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:w-40"
        >
          <option value="all">كل النشاط</option>
          <option value="active">نشط (أسبوع)</option>
          <option value="inactive">غير نشط</option>
        </select>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:w-48"
        >
          <option value="all">كل الكورسات</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-medium text-muted-foreground">الاسم</th>
                <th className="text-right p-3 font-medium text-muted-foreground">النوع</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">المرحلة</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الكورسات</th>
                <th className="text-right p-3 font-medium text-muted-foreground">متوسط التقدم</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">آخر نشاط</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">المدفوع</th>
                <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا توجد نتائج</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                          {s.full_name?.[0] || "؟"}
                        </div>
                        <span className="font-medium text-foreground">{s.full_name || "بدون اسم"}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${userTypeColor[s.user_type] || "bg-muted text-muted-foreground"}`}>
                        {userTypeLabel[s.user_type] || s.user_type}
                      </span>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{s.education_level || "—"}</td>
                    <td className="p-3 font-semibold text-foreground">{s.enrollmentCount}</td>
                    <td className="p-3 min-w-[110px]">
                      {s.enrollmentCount > 0 ? (
                        <div className="flex items-center gap-2">
                          <Progress value={s.avgProgress} className="h-1.5 flex-1" />
                          <span className="text-xs font-bold text-foreground w-9 text-end">{s.avgProgress}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {s.lastActivity
                        ? new Date(s.lastActivity).toLocaleDateString("ar-EG")
                        : "—"}
                    </td>
                    <td className="p-3 hidden sm:table-cell font-semibold text-success" dir="ltr">
                      {s.totalPaid > 0 ? `$${s.totalPaid.toFixed(2)}` : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(s)} title="التفاصيل">📋</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s)} className="text-destructive" title="حذف">🗑️</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border border-border max-w-2xl w-full p-6 shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full gradient-hero flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {selected.full_name?.[0] || "؟"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.full_name}</h2>
                  <span className={`text-xs px-2 py-1 rounded-full ${userTypeColor[selected.user_type] || "bg-muted"}`}>
                    {userTypeLabel[selected.user_type] || selected.user_type}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>✕</Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">السن</div>
                <div className="font-bold text-foreground text-sm">{selected.age || "—"}</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">المرحلة</div>
                <div className="font-bold text-foreground text-xs truncate">{selected.education_level || "—"}</div>
              </div>
              <div className="bg-success/10 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">المدفوع</div>
                <div className="font-bold text-success text-sm" dir="ltr">${selected.totalPaid.toFixed(2)}</div>
              </div>
              <div className="bg-primary/10 rounded-lg p-2.5 text-center">
                <div className="text-[10px] text-muted-foreground mb-0.5">آخر نشاط</div>
                <div className="font-bold text-primary text-[10px]">
                  {selected.lastActivity
                    ? new Date(selected.lastActivity).toLocaleDateString("ar-EG")
                    : "لم يبدأ"}
                </div>
              </div>
            </div>

            {selected.phone && (
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <div className="text-xs text-muted-foreground mb-1">رقم الجوال</div>
                <div className="font-medium text-foreground" dir="ltr">{selected.phone}</div>
              </div>
            )}

            <div>
              <div className="text-sm font-semibold text-foreground mb-2">
                📚 الكورسات ({selected.enrollmentCount})
              </div>
              {selected.enrolledCourses.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">لا توجد كورسات مسجَّلة</div>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {selected.enrolledCourses.map((e) => (
                    <li key={e.course_id} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{e.course_title}</div>
                          {e.last_lesson_title && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              آخر درس: {e.last_lesson_title}
                            </div>
                          )}
                        </div>
                        {e.completed && (
                          <span className="text-[10px] bg-success/15 text-success px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                            ✅ مكتمل
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={e.progress_percentage} className="h-1.5 flex-1" />
                        <span className="text-xs font-bold text-foreground w-10 text-end">{e.progress_percentage}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-border">
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(selected)}>
                🗑️ حذف الحساب
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>إغلاق</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
