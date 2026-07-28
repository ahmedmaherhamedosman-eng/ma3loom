import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { BookOpen, PlayCircle, CheckCircle2, Award, Search, LayoutGrid, List, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { downloadCertificatePDF } from "@/lib/certificate";

type FilterTab = "all" | "in_progress" | "not_started" | "completed";
type ViewMode = "grid" | "list";

export const Route = createFileRoute("/my-courses")({
  head: () => ({
    meta: [
      { title: "كورساتي — معلوم" },
      { name: "description", content: "كل الكورسات المسجل بها مع نسبة التقدم لكل كورس" },
    ],
  }),
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: MyCoursesPage,
});

interface CourseInfo {
  id: string;
  title: string;
  image_url: string | null;
  instructor: string;
  lessons_count: number;
  is_free: boolean;
  price: number;
  certificate_requirement?: string;
}
interface EnrollmentRow {
  id: string;
  course_id: string;
  progress_percentage: number;
  completed: boolean;
  last_lesson_id: string | null;
  enrolled_at: string;
  course: CourseInfo | null;
  hasQuiz: boolean;
  quizPassed: boolean;
  certificate?: { id: string; verification_code: string; issued_at: string; quiz_score: number | null } | null;
}

interface EnrollmentRaw {
  id: string;
  course_id: string;
  progress_percentage: number;
  completed: boolean;
  last_lesson_id: string | null;
  enrolled_at: string;
}

interface CourseRaw {
  id: string;
  title: string;
  image_url: string | null;
  instructor: string;
  lessons_count: number;
  is_free: boolean;
  price: number;
  certificate_requirement?: string;
}

interface LessonRaw {
  id: string;
  course_id: string;
}

interface QuizRaw {
  id: string;
  course_id: string;
}

interface CertificateRaw {
  id: string;
  course_id: string;
  verification_code: string;
  issued_at: string;
  quiz_score: number | null;
}

interface QuizAttemptRaw {
  quiz_id: string;
}

function MyCoursesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [firstLessonByCourse, setFirstLessonByCourse] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [view, setView] = useState<ViewMode>("grid");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    const uid = session.user.id;

    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", uid).maybeSingle(),
      supabase
        .from("enrollments")
        .select("id, course_id, progress_percentage, completed, last_lesson_id, enrolled_at")
        .eq("user_id", uid)
        .order("enrolled_at", { ascending: false }),
    ]);
    setProfileName(profile?.full_name || session.user.email || "طالب");

    const enrollmentRows = (rows || []) as EnrollmentRaw[];
    const courseIds = enrollmentRows.map((r) => r.course_id);

    const courseMap: Record<string, CourseInfo> = {};
    const firstLessonMap: Record<string, string> = {};
    const quizByCourse: Record<string, string> = {};
    const passedQuizIds = new Set<string>();
    const certByCourse: Record<string, EnrollmentRow["certificate"]> = {};

    if (courseIds.length > 0) {
      const [coursesRes, lessonsRes, quizzesRes, certsRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, image_url, instructor, lessons_count, is_free, price, certificate_requirement")
          .in("id", courseIds),
        supabase
          .from("lessons")
          .select("id, course_id, sort_order")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .order("sort_order"),
        supabase
          .from("quizzes")
          .select("id, course_id, is_published")
          .in("course_id", courseIds)
          .eq("is_published", true),
        supabase
          .from("certificates")
          .select("id, course_id, verification_code, issued_at, quiz_score")
          .eq("user_id", uid)
          .in("course_id", courseIds),
      ]);

      (coursesRes.data as CourseRaw[] | null || []).forEach((c) => { courseMap[c.id] = c; });
      (lessonsRes.data as LessonRaw[] | null || []).forEach((l) => {
        if (!firstLessonMap[l.course_id]) firstLessonMap[l.course_id] = l.id;
      });
      (quizzesRes.data as QuizRaw[] | null || []).forEach((q) => { quizByCourse[q.course_id] = q.id; });
      (certsRes.data as CertificateRaw[] | null || []).forEach((c) => { certByCourse[c.course_id] = c; });

      const quizIds = Object.values(quizByCourse);
      if (quizIds.length > 0) {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, passed")
          .eq("user_id", uid)
          .eq("passed", true)
          .in("quiz_id", quizIds);
        (attempts as QuizAttemptRaw[] | null || []).forEach((a) => passedQuizIds.add(a.quiz_id));
      }
    }

    setEnrollments(
      enrollmentRows.map((r) => ({
        ...r,
        course: courseMap[r.course_id] || null,
        hasQuiz: !!quizByCourse[r.course_id],
        quizPassed: quizByCourse[r.course_id] ? passedQuizIds.has(quizByCourse[r.course_id]) : false,
        certificate: certByCourse[r.course_id] || null,
      }))
    );
    setFirstLessonByCourse(firstLessonMap);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleIssueCertificate = async (e: EnrollmentRow) => {
    if (!e.course) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const score = e.hasQuiz && e.quizPassed
      ? await (async () => {
          const { data } = await supabase
            .from("quiz_attempts")
            .select("score")
            .eq("user_id", session.user.id)
            .eq("passed", true)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return data?.score ?? null;
        })()
      : null;

    const { data, error } = await supabase
      .from("certificates")
      .insert({
        user_id: session.user.id,
        course_id: e.course.id,
        quiz_score: score,
      })
      .select("*")
      .single();

    if (error) {
      toast.error("لم نتمكن من إصدار الشهادة", {
        description: "تأكد من استيفاء شروط الكورس (إكمال الدروس و/أو اجتياز الاختبار)",
      });
      return;
    }

    toast.success("تم إصدار الشهادة! 🎓");
    downloadCertificatePDF({
      studentName: profileName,
      courseTitle: e.course.title,
      instructor: e.course.instructor,
      issuedAt: data.issued_at,
      verificationCode: data.verification_code,
      quizScore: data.quiz_score,
    });
    load();
  };

  const handleDownloadExisting = (e: EnrollmentRow) => {
    if (!e.certificate || !e.course) return;
    downloadCertificatePDF({
      studentName: profileName,
      courseTitle: e.course.title,
      instructor: e.course.instructor,
      issuedAt: e.certificate.issued_at,
      verificationCode: e.certificate.verification_code,
      quizScore: e.certificate.quiz_score,
    });
  };

  const inProgress = useMemo(() => enrollments.filter((e) => !e.completed && e.progress_percentage > 0), [enrollments]);
  const notStarted = useMemo(() => enrollments.filter((e) => !e.completed && e.progress_percentage === 0), [enrollments]);
  const completed = useMemo(() => enrollments.filter((e) => e.completed), [enrollments]);

  const filtered = useMemo(() => {
    let list = enrollments;
    if (filter === "in_progress") list = inProgress;
    else if (filter === "completed") list = completed;
    else if (filter === "not_started") list = notStarted;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) =>
        (e.course?.title || "").toLowerCase().includes(q) ||
        (e.course?.instructor || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrollments, filter, search, inProgress, notStarted, completed]);

  if (loading) {
    return (
      <div className="py-12 mx-auto max-w-6xl px-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="py-20 text-center px-4">
        <div className="mx-auto w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mb-5">
          <BookOpen className="text-primary-foreground" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">لم تسجّل في أي كورس بعد</h1>
        <p className="text-muted-foreground mb-6">ابدأ رحلتك التعليمية واستكشف كورساتنا المميزة</p>
        <Link to="/courses">
          <Button variant="hero" size="lg">تصفّح الكورسات</Button>
        </Link>
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: "all", label: "الكل", count: enrollments.length, color: "text-foreground" },
    { key: "in_progress", label: "قيد التعلم", count: inProgress.length, color: "text-primary" },
    { key: "not_started", label: "لم يبدأ", count: notStarted.length, color: "text-warm" },
    { key: "completed", label: "مكتمل", count: completed.length, color: "text-success" },
  ];

  return (
    <div className="py-8 lg:py-12 bg-muted/20 min-h-[80vh]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2 flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl gradient-hero flex items-center justify-center">
                  <BookOpen className="text-primary-foreground" size={22} />
                </span>
                كورساتي
              </h1>
              <p className="text-muted-foreground">
                {enrollments.length} كورس · {inProgress.length} جاري · {completed.length} مكتمل
              </p>
            </div>
            <Link to="/courses">
              <Button variant="outline" size="sm">
                <Sparkles size={14} className="me-1" /> تصفح كورسات جديدة
              </Button>
            </Link>
          </div>

          {/* Search + view toggle */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="ابحث في كورساتي..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 bg-card"
              />
            </div>
            <div className="hidden sm:flex bg-card border border-border rounded-md p-0.5">
              <button
                onClick={() => setView("grid")}
                className={`px-2.5 rounded ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="عرض شبكي"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-2.5 rounded ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="عرض قائمة"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                  filter === t.key
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                {t.label}
                <span className={`ms-2 text-xs ${filter === t.key ? "text-primary-foreground/80" : t.color}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Search className="mx-auto text-muted-foreground/50 mb-3" size={40} />
            <p className="text-muted-foreground mb-4">لم نجد نتائج تطابق بحثك</p>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
              مسح الفلاتر
            </Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((e) => (
              <CourseProgressCard
                key={e.id}
                enrollment={e}
                resumeLessonId={e.last_lesson_id || firstLessonByCourse[e.course_id]}
                onIssueCertificate={() => handleIssueCertificate(e)}
                onDownloadCertificate={() => handleDownloadExisting(e)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => (
              <CourseListRow
                key={e.id}
                enrollment={e}
                resumeLessonId={e.last_lesson_id || firstLessonByCourse[e.course_id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseListRow({ enrollment, resumeLessonId }: {
  enrollment: EnrollmentRow; resumeLessonId: string | undefined;
}) {
  const c = enrollment.course;
  if (!c) return null;
  const pct = enrollment.progress_percentage;
  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center hover:shadow-md transition-shadow">
      <Link to="/courses/$courseId" params={{ courseId: c.id }} className="w-full sm:w-32 h-24 sm:h-20 rounded-lg bg-muted overflow-hidden shrink-0">
        {c.image_url ? <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" /> : <div className="w-full h-full gradient-hero" />}
      </Link>
      <div className="flex-1 min-w-0">
        <Link to="/courses/$courseId" params={{ courseId: c.id }}>
          <h4 className="font-bold text-foreground line-clamp-1 hover:text-primary transition-colors">{c.title}</h4>
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">{c.instructor} · {c.lessons_count} درس</p>
        <div className="flex items-center gap-2">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">{pct}%</span>
        </div>
      </div>
      {resumeLessonId && (
        <Link to="/courses/$courseId/lessons/$lessonId" params={{ courseId: c.id, lessonId: resumeLessonId }}>
          <Button variant={enrollment.completed ? "outline" : "hero"} size="sm" className="w-full sm:w-auto whitespace-nowrap">
            {enrollment.completed ? "مراجعة" : pct > 0 ? "متابعة" : "ابدأ التعلم"}
          </Button>
        </Link>
      )}
    </div>
  );
}

function CourseProgressCard({
  enrollment,
  resumeLessonId,
  onIssueCertificate,
  onDownloadCertificate,
}: {
  enrollment: EnrollmentRow;
  resumeLessonId: string | undefined;
  onIssueCertificate: () => void;
  onDownloadCertificate: () => void;
}) {
  const c = enrollment.course;
  if (!c) return null;
  const pct = enrollment.progress_percentage;
  const isCompleted = enrollment.completed;
  const req = (c.certificate_requirement || "completion") as "completion" | "quiz" | "both" | "none";

  // Eligibility (mirrors DB function)
  const completionOk = pct >= 100;
  const quizOk = enrollment.hasQuiz ? enrollment.quizPassed : false;
  const eligible =
    req === "completion" ? completionOk
    : req === "quiz" ? quizOk
    : req === "both" ? (completionOk && quizOk)
    : false;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
      <Link
        to="/courses/$courseId"
        params={{ courseId: c.id }}
        className="block aspect-video bg-muted relative"
      >
        {c.image_url ? (
          <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full gradient-hero" />
        )}
        {isCompleted && (
          <div className="absolute top-3 end-3 bg-success text-success-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} /> مكتمل
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to="/courses/$courseId" params={{ courseId: c.id }} className="block mb-1">
          <h3 className="font-bold text-foreground line-clamp-2 hover:text-primary transition-colors">
            {c.title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mb-3">
          {c.instructor} · {c.lessons_count} درس
        </p>

        <div className="mb-3 mt-auto">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-foreground font-medium">التقدم</span>
            <span className="text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="space-y-2">
          {resumeLessonId ? (
            <Link
              to="/courses/$courseId/lessons/$lessonId"
              params={{ courseId: c.id, lessonId: resumeLessonId }}
            >
              <Button variant={isCompleted ? "outline" : "hero"} size="sm" className="w-full">
                {isCompleted ? "مراجعة" : pct > 0 ? "أكمل من حيث توقفت" : "ابدأ التعلم"}
              </Button>
            </Link>
          ) : (
            <Link to="/courses/$courseId" params={{ courseId: c.id }}>
              <Button variant="outline" size="sm" className="w-full">صفحة الكورس</Button>
            </Link>
          )}

          {enrollment.hasQuiz && !enrollment.certificate && (
            <Link to="/courses/$courseId/quiz" params={{ courseId: c.id }}>
              <Button variant="outline" size="sm" className="w-full">
                📝 {enrollment.quizPassed ? "إعادة الاختبار" : "ابدأ الاختبار النهائي"}
              </Button>
            </Link>
          )}

          {req !== "none" && (
            enrollment.certificate ? (
              <Button variant="hero" size="sm" className="w-full" onClick={onDownloadCertificate}>
                <Award size={14} className="me-1" /> تحميل الشهادة
              </Button>
            ) : eligible ? (
              <Button variant="hero" size="sm" className="w-full" onClick={onIssueCertificate}>
                <Award size={14} className="me-1" /> احصل على الشهادة
              </Button>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
