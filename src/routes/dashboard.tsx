import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Award, PlayCircle, TrendingUp, Calendar, Clock,
  Target, Flame, GraduationCap, Sparkles, ArrowLeft, CheckCircle2,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم الطالب — معلوم" },
      { name: "description", content: "نظرة شاملة على رحلتك التعليمية: كورساتك، شهاداتك، وتقدمك" },
    ],
  }),
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  component: DashboardPage,
});

interface CourseInfo {
  id: string; title: string; image_url: string | null;
  instructor: string; lessons_count: number;
}
interface EnrollmentRow {
  id: string; course_id: string; progress_percentage: number;
  completed: boolean; last_lesson_id: string | null; enrolled_at: string;
  course: CourseInfo | null;
}
interface Suggestion {
  id: string; title: string; image_url: string | null;
  instructor: string; price: number; is_free: boolean; rating_avg: number;
}
interface UpcomingSession {
  id: string; title: string; scheduled_at: string;
  instructor_name: string | null; image_url: string | null;
}

interface PrivateBooking {
  id: string;
  subject: string;
  lesson_date: string | null;
  lesson_time: string | null;
  booking_status: string;
  payment_status: string;
  meeting_link: string | null;
}

interface EnrollmentRaw {
  id: string;
  course_id: string;
  progress_percentage: number;
  completed: boolean;
  last_lesson_id: string | null;
  enrolled_at: string;
}

interface LessonProgressRow {
  watched_seconds: number | null;
  last_watched_at: string | null;
}

interface LiveSessionRow {
  id: string;
  title: string;
  scheduled_at: string;
  instructor_name: string | null;
  image_url: string | null;
}

interface BookingRow {
  live_sessions: LiveSessionRow | null;
}

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState("");
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [firstLessonByCourse, setFirstLessonByCourse] = useState<Record<string, string>>({});
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [totalWatchedSeconds, setTotalWatchedSeconds] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [privateBookings, setPrivateBookings] = useState<PrivateBooking[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUser(session.user);
      const uid = session.user.id;

      const [
        { data: profile },
        { data: rows },
        { count: certCount },
        { data: progress },
        { data: bookings },
        { data: privateBookingsRes },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", uid).maybeSingle(),
        supabase.from("enrollments")
          .select("id, course_id, progress_percentage, completed, last_lesson_id, enrolled_at")
          .eq("user_id", uid).order("enrolled_at", { ascending: false }),
        supabase.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("lesson_progress")
          .select("watched_seconds, last_watched_at").eq("user_id", uid),
        supabase.from("live_session_bookings")
          .select("session_id, status, live_sessions(id, title, scheduled_at, instructor_name, image_url)")
          .eq("user_id", uid).eq("status", "confirmed"),
        supabase
          .from("private_lesson_bookings")
          .select("id, subject, lesson_date, lesson_time, booking_status, payment_status, meeting_link")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      setProfileName(profile?.full_name || session.user.email?.split("@")[0] || "طالب");
      setCertificatesCount(certCount || 0);

      const enrollmentRows = (rows || []) as EnrollmentRaw[];
      const courseIds = enrollmentRows.map((r) => r.course_id);
      const courseMap: Record<string, CourseInfo> = {};
      const firstLessonMap: Record<string, string> = {};

      if (courseIds.length > 0) {
        const [coursesRes, lessonsRes] = await Promise.all([
          supabase.from("courses")
            .select("id, title, image_url, instructor, lessons_count")
            .in("id", courseIds),
          supabase.from("lessons")
            .select("id, course_id, sort_order")
            .in("course_id", courseIds).eq("is_published", true).order("sort_order"),
        ]);
        (coursesRes.data as CourseInfo[] | null || []).forEach((c) => { courseMap[c.id] = c; });
        (lessonsRes.data as Array<{ id: string; course_id: string }> | null || []).forEach((l) => {
          if (!firstLessonMap[l.course_id]) firstLessonMap[l.course_id] = l.id;
        });
      }

      setEnrollments(enrollmentRows.map((r) => ({ ...r, course: courseMap[r.course_id] || null })));
      setFirstLessonByCourse(firstLessonMap);

      // Total watched + streak
      const totalSec = ((progress as LessonProgressRow[] | null) || []).reduce((s: number, p) => s + (p.watched_seconds || 0), 0);
      setTotalWatchedSeconds(totalSec);

      const days = new Set<string>();
      (((progress as LessonProgressRow[] | null) || [])).forEach((p) => {
        if (p.last_watched_at) days.add(new Date(p.last_watched_at).toDateString());
      });
      // Calculate streak (consecutive days ending today/yesterday)
      let streak = 0;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 60; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        if (days.has(d.toDateString())) streak++;
        else if (i > 0) break;
      }
      setStreakDays(streak);

      // Upcoming live sessions
      const upcomingSessions: UpcomingSession[] = ((bookings as BookingRow[] | null) || [])
        .map((b) => b.live_sessions)
        .filter((s): s is LiveSessionRow => !!s && new Date(s.scheduled_at) > new Date())
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 3);
      setUpcoming(upcomingSessions);
      setPrivateBookings((privateBookingsRes as PrivateBooking[] | null) || []);

      // Suggested courses (not enrolled)
      const enrolledSet = new Set(courseIds);
      const { data: allCourses } = await supabase
        .from("courses")
        .select("id, title, image_url, instructor, price, is_free, rating_avg")
        .eq("is_published", true)
        .order("students_count", { ascending: false })
        .limit(8);
      setSuggestions((((allCourses as Suggestion[] | null) || []).filter((c) => !enrolledSet.has(c.id)).slice(0, 4)));

      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-[80vh] py-8">
        <div className="mx-auto max-w-6xl px-4 space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const inProgress = enrollments.filter((e) => !e.completed && e.progress_percentage > 0);
  const notStarted = enrollments.filter((e) => e.progress_percentage === 0);
  const completed = enrollments.filter((e) => e.completed);
  const continueLearning = inProgress.slice(0, 3);
  const hours = Math.floor(totalWatchedSeconds / 3600);
  const mins = Math.floor((totalWatchedSeconds % 3600) / 60);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 18) return "مساء الخير";
    return "مساء النور";
  })();

  return (
    <div className="min-h-[80vh] bg-muted/20 pb-12">
      {/* Hero greeting */}
      <div className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-primary-foreground/80 text-sm mb-1">{greeting}،</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground">
                {profileName} 👋
              </h1>
              <p className="text-primary-foreground/90 mt-2 text-sm sm:text-base">
                جاهز لمواصلة رحلة التعلم اليوم؟
              </p>
            </div>
            {streakDays > 0 && (
              <div className="bg-warm/20 backdrop-blur-sm border border-warm/30 rounded-2xl px-5 py-3 flex items-center gap-3 self-start">
                <Flame className="text-warm" size={32} />
                <div>
                  <div className="text-2xl font-extrabold text-primary-foreground">{streakDays}</div>
                  <div className="text-xs text-primary-foreground/80">يوم متتالي 🔥</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            icon={<BookOpen size={22} />}
            value={enrollments.length}
            label="كورساتي"
            color="from-primary/15 to-primary/5"
            iconColor="text-primary"
          />
          <StatCard
            icon={<CheckCircle2 size={22} />}
            value={completed.length}
            label="كورس مكتمل"
            color="from-success/15 to-success/5"
            iconColor="text-success"
          />
          <StatCard
            icon={<Award size={22} />}
            value={certificatesCount}
            label="شهادة"
            color="from-warm/15 to-warm/5"
            iconColor="text-warm"
          />
          <StatCard
            icon={<Clock size={22} />}
            value={hours > 0 ? `${hours}س ${mins}د` : `${mins} د`}
            label="وقت التعلم"
            color="from-accent/15 to-accent/5"
            iconColor="text-foreground"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue learning */}
            <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <PlayCircle className="text-primary" size={20} />
                  أكمل التعلم
                </h2>
                {inProgress.length > 3 && (
                  <Link to="/my-courses" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                    عرض الكل <ArrowLeft size={14} />
                  </Link>
                )}
              </div>
              {continueLearning.length === 0 ? (
                <EmptyBox
                  icon={<Sparkles size={28} className="text-primary" />}
                  title="ابدأ رحلتك التعليمية"
                  subtitle="لم تبدأ أي كورس بعد. اكتشف كورساتنا المميزة!"
                  ctaLabel="تصفح الكورسات"
                  ctaTo="/courses"
                />
              ) : (
                <div className="space-y-3">
                  {continueLearning.map((e) => (
                    <ContinueCard
                      key={e.id}
                      enrollment={e}
                      lessonId={e.last_lesson_id || firstLessonByCourse[e.course_id]}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Not started */}
            {notStarted.length > 0 && (
              <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                  <Target className="text-warm" size={20} />
                  ابدأ كورساتك الجديدة
                </h2>
                <div className="space-y-3">
                  {notStarted.slice(0, 2).map((e) => (
                    <ContinueCard
                      key={e.id}
                      enrollment={e}
                      lessonId={firstLessonByCourse[e.course_id]}
                      isNew
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Target className="text-primary" size={20} />
                  حصصي الخصوصية
                </h2>
                <Link to="/private-lessons" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                  طلب حصة جديدة <ArrowLeft size={14} />
                </Link>
              </div>

              {privateBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  لا توجد حجوزات خاصة بعد. ابدأ الآن باختيار الباقة المناسبة.
                </div>
              ) : (
                <div className="space-y-3">
                  {privateBookings.map((booking) => (
                    <div key={booking.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{booking.subject}</p>
                        <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-1">
                          {booking.booking_status === "confirmed" ? "قادمة" : booking.booking_status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {booking.lesson_date || "-"} {booking.lesson_time || ""}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {booking.meeting_link ? (
                          <a href={booking.meeting_link} target="_blank" rel="noreferrer">
                            <Button size="sm">الانضمام للحصة</Button>
                          </a>
                        ) : (
                          <Button size="sm" variant="outline" disabled>رابط الحصة سيظهر قريباً</Button>
                        )}
                        <Button size="sm" variant="outline">إعادة جدولة</Button>
                        <Button size="sm" variant="outline">إلغاء الحصة</Button>
                        <Button size="sm" variant="outline">الواجبات</Button>
                        <Button size="sm" variant="outline">التقييم</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <section className="bg-card rounded-2xl border border-border p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="text-warm" size={20} />
                    مقترحة لك
                  </h2>
                  <Link to="/courses" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                    عرض الكل <ArrowLeft size={14} />
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {suggestions.map((c) => (
                    <Link
                      key={c.id}
                      to="/courses/$courseId"
                      params={{ courseId: c.id }}
                      className="flex gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-muted/30 transition-all group"
                    >
                      <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full gradient-hero" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">{c.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{c.instructor}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold text-warm">⭐ {Number(c.rating_avg).toFixed(1)}</span>
                          <span className="text-sm font-extrabold text-primary">
                            {c.is_free || c.price === 0 ? "مجاني" : `$${c.price}`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming live */}
            <section className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                <Calendar className="text-primary" size={18} />
                حصصك القادمة
              </h3>
              {upcoming.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Calendar className="mx-auto mb-2 text-muted-foreground/50" size={32} />
                  <p>لا توجد حصص قادمة</p>
                  <Link to="/live-classes" className="text-primary font-semibold hover:underline text-xs block mt-2">
                    تصفح الحصص المباشرة
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((s) => (
                    <div key={s.id} className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="w-12 h-12 rounded-lg gradient-hero shrink-0 flex items-center justify-center text-primary-foreground">
                        <PlayCircle size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground line-clamp-1">{s.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(s.scheduled_at).toLocaleString("ar-EG", {
                            weekday: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick actions */}
            <section className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-bold text-foreground mb-4">روابط سريعة</h3>
              <div className="grid grid-cols-2 gap-2">
                <QuickAction to="/my-courses" icon={<BookOpen size={18} />} label="كورساتي" />
                <QuickAction to="/profile" icon={<GraduationCap size={18} />} label="ملفي" />
                <QuickAction to="/courses" icon={<Sparkles size={18} />} label="استكشف" />
                <QuickAction to="/tutoring" icon={<Target size={18} />} label="حصة خاصة" />
              </div>
            </section>

            {/* Achievement */}
            {certificatesCount > 0 && (
              <section className="bg-gradient-to-br from-warm/15 via-card to-primary/10 rounded-2xl border border-warm/30 p-5 text-center">
                <Award className="mx-auto text-warm mb-2" size={36} />
                <h3 className="font-bold text-foreground mb-1">إنجازاتك</h3>
                <p className="text-3xl font-extrabold text-warm mb-1">{certificatesCount}</p>
                <p className="text-xs text-muted-foreground mb-3">شهادة معتمدة</p>
                <Link to="/profile">
                  <Button variant="outline" size="sm" className="w-full">عرض شهاداتي</Button>
                </Link>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, iconColor }: {
  icon: React.ReactNode; value: number | string; label: string; color: string; iconColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl border border-border p-4 sm:p-5 hover:shadow-lg transition-shadow`}>
      <div className={`${iconColor} mb-2`}>{icon}</div>
      <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function ContinueCard({ enrollment, lessonId, isNew = false }: {
  enrollment: EnrollmentRow; lessonId: string | undefined; isNew?: boolean;
}) {
  const c = enrollment.course;
  if (!c) return null;
  return (
    <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all bg-background">
      <Link
        to="/courses/$courseId"
        params={{ courseId: c.id }}
        className="w-full sm:w-32 h-24 sm:h-20 rounded-lg bg-muted overflow-hidden shrink-0 group/img"
      >
        {c.image_url ? (
          <img src={c.image_url} alt={c.title} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full gradient-hero" />
        )}
      </Link>
      <div className="flex-1 min-w-0 flex flex-col">
        <Link to="/courses/$courseId" params={{ courseId: c.id }}>
          <h4 className="font-semibold text-foreground text-sm line-clamp-2 hover:text-primary transition-colors">{c.title}</h4>
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">{c.instructor}</p>
        <div className="flex items-center gap-2 mt-auto">
          <Progress value={enrollment.progress_percentage} className="h-1.5 flex-1" />
          <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">
            {enrollment.progress_percentage}%
          </span>
        </div>
      </div>
      {lessonId && (
        <Link
          to="/courses/$courseId/lessons/$lessonId"
          params={{ courseId: c.id, lessonId }}
          className="self-stretch sm:self-center"
        >
          <Button variant={isNew ? "warm" : "hero"} size="sm" className="w-full sm:w-auto whitespace-nowrap">
            {isNew ? "ابدأ الآن" : "متابعة"}
          </Button>
        </Link>
      )}
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-semibold text-foreground text-center">{label}</span>
    </Link>
  );
}

function EmptyBox({ icon, title, subtitle, ctaLabel, ctaTo }: {
  icon: React.ReactNode; title: string; subtitle: string; ctaLabel: string; ctaTo: string;
}) {
  return (
    <div className="text-center py-8 px-4">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
      <Link to={ctaTo}>
        <Button variant="hero" size="sm">{ctaLabel}</Button>
      </Link>
    </div>
  );
}
