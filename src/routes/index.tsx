import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/CourseCard";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-students.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "معلوم — منصة تعليمية عربية متكاملة" },
      { name: "description", content: "منصة معلوم التعليمية للطلاب العرب. كورسات في العلوم والرياضيات واللغات والبرمجة لطلاب المدارس والجامعات." },
      { property: "og:title", content: "معلوم — منصة تعليمية عربية متكاملة" },
      { property: "og:description", content: "تعلّم بسهولة مع أفضل المعلمين العرب. كورسات مجانية ومدفوعة لكل المراحل." },
    ],
  }),
  component: HomePage,
});

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  instructor: string;
  category: string;
  level: string;
  students_count: number;
  lessons_count: number;
  price: number;
  image_url: string | null;
}

interface SpecialtyRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  price_per_hour: number;
}

interface PostRow {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
}

interface LiveRow {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  platform: string;
  meeting_link: string | null;
}

const platformInfo: Record<string, { label: string; icon: string; color: string }> = {
  zoom: { label: "Zoom", icon: "🎥", color: "bg-primary/10 text-primary" },
  teams: { label: "Microsoft Teams", icon: "💼", color: "bg-primary/10 text-primary" },
  google_meet: { label: "Google Meet", icon: "📹", color: "bg-success/10 text-success" },
};

const features = [
  { icon: "▶", title: "فيديوهات تعليمية", description: "محتوى مرئي عالي الجودة مع إمكانية المشاهدة في أي وقت" },
  { icon: "✓", title: "اختبارات تفاعلية", description: "قيّم مستواك بعد كل درس واحصل على نتائجك فوراً" },
  { icon: "🏅", title: "شهادات إتمام", description: "احصل على شهادة معتمدة بعد إتمام كل كورس بنجاح" },
  { icon: "👥", title: "مجتمع تعليمي", description: "تواصل مع المعلمين والطلاب وشارك في النقاشات" },
  { icon: "📱", title: "متوافق مع الموبايل", description: "تعلم من أي جهاز — كمبيوتر، تابلت، أو موبايل" },
  { icon: "🎯", title: "محتوى متدرج", description: "دروس مرتبة بعناية من الأسهل للأصعب لضمان الفهم" },
];

function HomePage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveRow[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyRow[]>([]);
  const [stats, setStats] = useState({ students: 0, courses: 0, lessons: 0 });
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const [coursesRes, postsRes, liveRes, profilesRes, specRes] = await Promise.all([
        supabase.from("courses").select("id,title,description,instructor,category,level,students_count,lessons_count,price,currency,image_url")
          .eq("is_published", true).order("created_at", { ascending: false }).limit(4),
        supabase.from("posts").select("id,title,excerpt,image_url,published_at")
          .eq("status", "published").order("published_at", { ascending: false }).limit(3),
        supabase.from("live_sessions").select("id,title,description,scheduled_at,duration_minutes,platform,meeting_link")
          .gte("scheduled_at", new Date().toISOString()).order("scheduled_at", { ascending: true }).limit(3),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("tutoring_specialties").select("id,name,slug,description,icon,price_per_hour")
          .eq("is_active", true).order("sort_order").limit(6),
      ]);

      setCourses(coursesRes.data || []);
      setPosts(postsRes.data || []);
      setLiveSessions(liveRes.data || []);
      setSpecialties(specRes.data || []);

      const totalLessons = (coursesRes.data || []).reduce((s, c) => s + (c.lessons_count || 0), 0);
      setStats({
        students: profilesRes.count || 0,
        courses: coursesRes.data?.length || 0,
        lessons: totalLessons,
      });

      // Fetch current user's enrollments to mark cards correctly
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: enr } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", session.user.id);
        setEnrolledIds(new Set((enr || []).map((e) => e.course_id)));
      }
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="gradient-hero relative">
          {/* Decorative background blobs */}
          <div className="absolute top-0 -start-20 w-96 h-96 bg-warm/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -end-20 w-[28rem] h-[28rem] bg-primary-foreground/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 rounded-full px-4 py-2 mb-6">
                  <span className="w-2 h-2 rounded-full bg-warm animate-pulse" />
                  <span className="text-primary-foreground/95 text-sm font-medium">
                    منصة معلوم — تعلّم بدون حدود
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6">
                  تعلّم بلا حدود
                  <br />
                  <span className="text-warm drop-shadow-lg">مع معلوم</span>
                </h1>

                <p className="text-lg text-primary-foreground/85 leading-relaxed mb-8 max-w-lg">
                  منصة تعليمية عربية متكاملة لطلاب المدارس والجامعات. كورسات في جميع التخصصات مع اختبارات وشهادات معتمدة.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link to="/courses">
                    <Button variant="warm" size="xl" className="shadow-xl shadow-warm/30">تصفح الكورسات</Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="outline" size="xl" className="border-primary-foreground/40 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 backdrop-blur-sm">
                      سجّل مجاناً
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="absolute -top-6 -end-6 w-24 h-24 bg-warm/30 rounded-2xl blur-2xl" />
                <div className="absolute -bottom-6 -start-6 w-32 h-32 bg-primary-foreground/20 rounded-full blur-2xl" />
                <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-primary-foreground/20">
                  <img src={heroImage} alt="طلاب يتعلمون على منصة معلوم" width={1920} height={1080} className="w-full h-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8">
            {[
              { value: stats.students, label: "طالب مسجل" },
              { value: stats.courses, label: "كورس متاح" },
              { value: stats.lessons, label: "درس تعليمي" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center group">
                <p className="text-3xl md:text-5xl font-extrabold text-gradient mb-2 transition-transform group-hover:scale-105">
                  {stat.value.toLocaleString("ar-EG")}+
                </p>
                <p className="text-sm md:text-base text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Live Sessions */}
      {liveSessions.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-warm/5 to-transparent">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
              <div>
                <div className="inline-flex items-center gap-2 bg-warm/10 text-warm rounded-full px-3 py-1 mb-3">
                  <span className="w-2 h-2 rounded-full bg-warm animate-pulse" />
                  <span className="text-xs font-bold">بث مباشر</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">حصص مباشرة قادمة</h2>
                <p className="text-muted-foreground text-sm mt-1">احجز مكانك الآن وانضم في الموعد</p>
              </div>
              <Link to="/live-classes">
                <Button variant="outline" size="lg">عرض كل الحصص</Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveSessions.map((s) => {
                const date = new Date(s.scheduled_at);
                const platform = platformInfo[s.platform] || platformInfo.zoom;
                return (
                  <Link
                    key={s.id}
                    to="/live-classes"
                    className="bg-card rounded-2xl border border-border p-5 card-hover flex flex-col block"
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl gradient-warm flex flex-col items-center justify-center text-warm-foreground">
                        <span className="text-xs font-medium">{date.toLocaleDateString("ar-EG", { month: "short" })}</span>
                        <span className="text-xl font-extrabold leading-none">{date.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 ${platform.color}`}>
                          <span>{platform.icon}</span>
                          <span>{platform.label}</span>
                        </div>
                        <h3 className="font-bold text-card-foreground mb-1 line-clamp-1">{s.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          🕐 {date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          {s.duration_minutes ? ` · ${s.duration_minutes} دقيقة` : ""}
                        </p>
                      </div>
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description}</p>}
                    <div className="mt-auto inline-flex items-center justify-center w-full h-9 px-4 rounded-md gradient-warm text-warm-foreground text-sm font-semibold">
                      احجز الآن {platform.icon}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 mb-4">
              <span className="text-sm font-bold">✨ مميزات المنصة</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
              ليه <span className="text-gradient">معلوم</span>؟
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              نقدم تجربة تعليمية متكاملة تجمع بين المحتوى العالي الجودة والتكنولوجيا الحديثة
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="group relative bg-card rounded-2xl border border-border p-6 card-hover overflow-hidden">
                <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 text-primary text-2xl ring-1 ring-primary/10">
                  {feature.icon}
                </div>
                <h3 className="relative text-lg font-bold text-card-foreground mb-2">{feature.title}</h3>
                <p className="relative text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Online Tutoring Specialties */}
      {specialties.length > 0 && (
        <section className="py-20 lg:py-24 bg-gradient-to-br from-primary/8 via-warm/5 to-background relative overflow-hidden">
          <div className="absolute top-20 -end-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 -start-32 w-80 h-80 bg-warm/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-warm/15 text-warm-foreground rounded-full px-4 py-1.5 mb-4 ring-1 ring-warm/30">
                <span className="text-sm font-bold">🎓 جديد</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
                حصص <span className="text-gradient">أونلاين</span> فردية
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                اطلب حصة خصوصية في التخصص اللي تحتاجه — من تحفيظ القرآن للرياضيات والبرمجة
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {specialties.map((s) => (
                <Link
                  key={s.id}
                  to="/tutoring"
                  className="bg-card rounded-2xl border border-border p-6 card-hover block group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl flex-shrink-0">{s.icon || "📚"}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-card-foreground mb-1.5 group-hover:text-primary transition-colors">
                        {s.name}
                      </h3>
                      {s.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">السعر/الساعة</span>
                        <span className="font-bold text-primary">
                          {s.price_per_hour === 0 ? "حسب الاتفاق" : `${s.price_per_hour} ر.س`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/tutoring">
                <Button variant="hero" size="xl">📨 اطلب حصتك الآن</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Courses */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/40 via-muted/30 to-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 mb-3">
                <span className="text-sm font-bold">📚 الكورسات</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">أحدث <span className="text-gradient">الكورسات</span></h2>
              <p className="text-muted-foreground text-lg">اختر من بين أفضل الكورسات المتاحة</p>
            </div>
            <Link to="/courses" className="hidden sm:block">
              <Button variant="outline" size="lg">عرض الكل ←</Button>
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              لا توجد كورسات منشورة بعد. ابدأ بإضافة كورس من لوحة التحكم.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  courseId={course.id}
                  title={course.title}
                  description={course.description || ""}
                  instructor={course.instructor}
                  category={course.category}
                  level={course.level}
                  students={course.students_count}
                  lessons={course.lessons_count}
                  price={course.price === 0 ? "مجاني" : course.price}
                  currency={(course as any).currency}
                  image={course.image_url || "/placeholder.svg"}
                  isEnrolled={enrolledIds.has(course.id)}
                />
              ))}
            </div>
          )}

          <div className="sm:hidden mt-8 text-center">
            <Link to="/courses">
              <Button variant="outline" size="lg" className="w-full">عرض كل الكورسات</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Posts */}
      {posts.length > 0 && (
        <section className="py-20 lg:py-28 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-accent/15 text-accent-foreground rounded-full px-4 py-1.5 mb-3">
                  <span className="text-sm font-bold">📖 المدونة</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">أحدث <span className="text-gradient">المقالات</span></h2>
                <p className="text-muted-foreground text-lg">اقرأ آخر النصائح والمقالات التعليمية</p>
              </div>
              <Link to="/blog" className="hidden sm:block">
                <Button variant="outline" size="lg">كل المقالات ←</Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  to="/blog/$postId"
                  params={{ postId: p.id }}
                  className="group bg-card rounded-2xl border border-border overflow-hidden card-hover block"
                >
                  {p.image_url && (
                    <div className="h-48 overflow-hidden bg-muted">
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {p.published_at ? new Date(p.published_at).toLocaleDateString("ar-EG") : ""}
                    </p>
                    <h3 className="font-bold text-card-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{p.title}</h3>
                    {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{p.excerpt}</p>}
                    <span className="text-sm font-semibold text-primary mt-4 inline-flex items-center gap-1">
                      اقرأ المزيد <span className="transition-transform group-hover:-translate-x-1">←</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative gradient-hero rounded-3xl p-12 md:p-16 text-center overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 -end-20 w-64 h-64 bg-warm/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 -start-20 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)] pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-warm animate-pulse" />
                <span className="text-primary-foreground/95 text-sm font-medium">انضم لآلاف الطلاب</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4">
                ابدأ رحلتك التعليمية اليوم
              </h2>
              <p className="text-primary-foreground/85 text-lg mb-8 max-w-lg mx-auto">
                سجّل مجاناً وابدأ التعلم فوراً. لا تحتاج بطاقة ائتمان.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/signup">
                  <Button variant="warm" size="xl" className="shadow-xl shadow-warm/30">سجّل الآن مجاناً</Button>
                </Link>
                <Link to="/courses">
                  <Button variant="outline" size="xl" className="border-primary-foreground/40 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 backdrop-blur-sm">
                    تصفح الكورسات
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
