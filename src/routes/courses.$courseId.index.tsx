import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StarRating } from "@/components/StarRating";
import { CourseContent, type ChapterWithLessons } from "@/components/CourseContent";
import { RatingDistribution } from "@/components/RatingDistribution";
import { ReviewsList, type ReviewItem } from "@/components/ReviewsList";
import { ReviewForm } from "@/components/ReviewForm";
import { SimilarCourses } from "@/components/SimilarCourses";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/courses/$courseId/")({
  head: () => ({
    meta: [
      { title: "تفاصيل الكورس — معلوم" },
      { name: "description", content: "شاهد تفاصيل الكورس والدروس على منصة معلوم" },
    ],
  }),
  component: CourseDetailPage,
});

interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor: string;
  category: string;
  level: string;
  price: number;
  currency: string | null;
  image_url: string | null;
  lessons_count: number;
  students_count: number;
  is_free: boolean;
  stripe_price_id: string | null;
  preview_video_url: string | null;
  rating_avg: number;
  rating_count: number;
  views_count: number;
}

function getYouTubeEmbedUrl(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function CourseDetailPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const { openCheckout, loading: checkoutLoading } = useStripeCheckout();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<ChapterWithLessons[]>([]);
  const [uncategorized, setUncategorized] = useState<ChapterWithLessons["lessons"]>([]);
  const [allLessonIds, setAllLessonIds] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [allRatings, setAllRatings] = useState<number[]>([]);
  const [enrollment, setEnrollment] = useState<{ id: string; progress_percentage: number } | null>(null);
  const [myReview, setMyReview] = useState<{ id: string; rating: number; comment: string | null } | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("description");
  const [htmlQuizzes, setHtmlQuizzes] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      difficulty: string;
      estimated_minutes: number | null;
      image_url: string | null;
    }>
  >([]);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);
      setUserEmail(session?.user?.email);

      const [courseRes, chaptersRes, lessonsRes, reviewsRes, catLinksRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("chapters").select("*").eq("course_id", courseId).order("sort_order"),
        supabase.from("lessons").select("*").eq("course_id", courseId).eq("is_published", true).order("sort_order"),
        supabase
          .from("course_reviews")
          .select("id, rating, comment, created_at, user_id")
          .eq("course_id", courseId)
          .order("created_at", { ascending: false }),
        supabase.from("course_categories").select("category_id").eq("course_id", courseId),
      ]);

      if (courseRes.data) setCourse(courseRes.data as Course);

      const lessonsData = (lessonsRes.data || []) as any[];
      const chaptersData = (chaptersRes.data || []) as any[];
      const uncat = lessonsData
        .filter((l) => !l.chapter_id)
        .map((l) => ({
          id: l.id,
          title: l.title,
          duration_minutes: l.duration_minutes,
          is_preview: !!l.is_preview,
        }));
      const built: ChapterWithLessons[] = chaptersData.map((ch) => ({
        id: ch.id,
        title: ch.title,
        lessons: lessonsData
          .filter((l) => l.chapter_id === ch.id)
          .map((l) => ({ id: l.id, title: l.title, duration_minutes: l.duration_minutes, is_preview: !!l.is_preview })),
      }));
      setChapters(built);
      setUncategorized(uncat);
      setAllLessonIds(lessonsData.map((l) => l.id));

      const revRows = (reviewsRes.data || []) as any[];
      const authorIds = Array.from(new Set(revRows.map((r) => r.user_id)));
      let nameMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", authorIds);
        nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      }
      setReviews(
        revRows.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          author_name: nameMap[r.user_id] || "طالب",
        })),
      );
      setAllRatings(revRows.map((r) => r.rating));

      setCategoryIds((catLinksRes.data || []).map((l: any) => l.category_id));

      const { data: hqData } = await supabase
        .from("html_quizzes")
        .select("id, title, description, difficulty, estimated_minutes, image_url")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("sort_order");
      setHtmlQuizzes(hqData || []);

      if (uid) {
        const [enrRes, roleRes, myRevRes, canRevRes] = await Promise.all([
          supabase
            .from("enrollments")
            .select("id, progress_percentage")
            .eq("user_id", uid)
            .eq("course_id", courseId)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
          supabase
            .from("course_reviews")
            .select("id, rating, comment")
            .eq("user_id", uid)
            .eq("course_id", courseId)
            .maybeSingle(),
          supabase.rpc("can_review_course", { _user_id: uid, _course_id: courseId }),
        ]);
        if (enrRes.data) setEnrollment(enrRes.data);
        if (roleRes.data) setIsAdmin(true);
        if (myRevRes.data) setMyReview(myRevRes.data);
        setCanReview(!!canRevRes.data);
      }

      setLoading(false);
    };
    load();
  }, [courseId]);

  const handleEnrollFree = async () => {
    setEnrolling(true);
    try {
      // Re-check session live (don't rely on stale userId state)
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id ?? userId;

      if (!uid) {
        toast.info("سجّل دخولك للبدء في الكورس");
        navigate({ to: "/login" });
        return;
      }

      // Enroll (ignore duplicate errors)
      const { data: existing } = await supabase
        .from("enrollments")
        .select("id, progress_percentage")
        .eq("user_id", uid)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!existing) {
        const { data: created, error: enrollErr } = await supabase
          .from("enrollments")
          .insert({ user_id: uid, course_id: courseId })
          .select("id, progress_percentage")
          .single();
        if (enrollErr) {
          console.error("[courses/$courseId] enroll error:", enrollErr);
          toast.error("تعذر تسجيلك في الكورس", { description: enrollErr.message });
          return;
        }
        if (created) setEnrollment(created);
      } else {
        setEnrollment(existing);
      }

      // Find first lesson
      const { data: firstLesson, error: lessonErr } = await supabase
        .from("lessons")
        .select("id")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();

      if (lessonErr) {
        console.error("[courses/$courseId] first lesson error:", lessonErr);
        toast.error("تعذر تحميل دروس الكورس", { description: lessonErr.message });
        return;
      }

      if (!firstLesson?.id) {
        toast.info("لا توجد دروس منشورة في هذا الكورس بعد");
        return;
      }

      // Hard navigation guarantees the lesson page mounts fresh
      window.location.href = `/courses/${courseId}/lessons/${firstLesson.id}`;
    } catch (err: any) {
      console.error("[courses/$courseId] handleEnrollFree fatal:", err);
      toast.error("حصل خطأ غير متوقع", { description: err?.message });
    } finally {
      setEnrolling(false);
    }
  };

  const handleBuyNow = async () => {
    if (!userId) {
      toast.info("سجّل الدخول أولاً");
      navigate({ to: "/login" });
      return;
    }
    await openCheckout({
      items: [{ courseId }],
      userId,
      customerEmail: userEmail,
    });
  };

  const reloadReviews = async () => {
    const { data } = await supabase
      .from("course_reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    const rows = (data || []) as any[];
    const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));
    let nameMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds);
      nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));
    }
    setReviews(
      rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        author_name: nameMap[r.user_id] || "طالب",
      })),
    );
    setAllRatings(rows.map((r) => r.rating));
    if (userId) {
      const mine = rows.find((r) => r.user_id === userId);
      setMyReview(mine ? { id: mine.id, rating: mine.rating, comment: mine.comment } : null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 mx-auto max-w-5xl px-4 space-y-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (!course) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">الكورس غير موجود</h1>
        <Link to="/courses">
          <Button variant="hero">العودة للكورسات</Button>
        </Link>
      </div>
    );
  }

  const isFree = course.is_free || course.price === 0;
  const isEnrolled = !!enrollment;
  const canAccessLessons = isEnrolled || isAdmin || isFree;
  const totalLessons = chapters.reduce((a, c) => a + c.lessons.length, 0) + uncategorized.length;
  const totalMinutes =
    chapters.reduce((a, c) => a + c.lessons.reduce((b, l) => b + (l.duration_minutes || 0), 0), 0) +
    uncategorized.reduce((a, l) => a + (l.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMin = totalMinutes % 60;
  const durationLabel =
    totalMinutes === 0 ? null : totalHours > 0 ? `${totalHours} س ${remainingMin} د` : `${totalMinutes} د`;
  const firstLessonId =
    uncategorized[0]?.id || chapters.find((c) => c.lessons.length > 0)?.lessons[0]?.id || allLessonIds[0];
  const previewEmbed = course.preview_video_url ? getYouTubeEmbedUrl(course.preview_video_url) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 via-background to-background">
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -end-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -start-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <nav className="text-xs text-muted-foreground mb-5 flex items-center gap-2">
            <Link to="/" className="hover:text-primary transition-colors">
              الرئيسية
            </Link>
            <span>›</span>
            <Link to="/courses" className="hover:text-primary transition-colors">
              الكورسات
            </Link>
            <span>›</span>
            <span className="text-foreground/70 truncate max-w-[200px]">{course.title}</span>
          </nav>

          <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 mb-10">
            <div>
              <div className="aspect-video bg-card rounded-2xl border border-border/60 overflow-hidden mb-6 shadow-lg shadow-primary/5">
                {previewEmbed ? (
                  <iframe
                    src={previewEmbed}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${course.title} — preview`}
                  />
                ) : course.preview_video_url ? (
                  <video src={course.preview_video_url} controls className="w-full h-full bg-black" />
                ) : course.image_url ? (
                  <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-hero" />
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                  {course.category}
                </span>
                <span className="text-xs font-semibold bg-accent/15 text-warm-foreground px-3 py-1.5 rounded-full">
                  {course.level}
                </span>
                {isAdmin && (
                  <span className="text-xs font-semibold bg-success/15 text-success px-3 py-1.5 rounded-full">
                    مدير
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 leading-tight">{course.title}</h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground mb-4">
                <StarRating
                  value={Number(course.rating_avg) || 0}
                  size="sm"
                  readOnly
                  showValue
                  count={course.rating_count}
                />
                <span className="flex items-center gap-1.5">
                  <span className="text-base">👥</span>
                  {course.students_count.toLocaleString("ar-EG")} طالب
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-base">📚</span>
                  {totalLessons} درس
                </span>
                {durationLabel && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">⏱</span>
                    {durationLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-card/60 border border-border/40 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-primary">
                  {course.instructor?.charAt(0) || "م"}
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">المدرّس</p>
                  <p className="text-sm font-semibold text-foreground">{course.instructor || "معلوم"}</p>
                </div>
              </div>
            </div>

            <aside className="bg-card rounded-2xl border border-border/60 p-6 h-fit lg:sticky lg:top-24 shadow-xl shadow-primary/5">
              <div className="flex items-baseline gap-2 mb-5">
                <span className={`text-4xl font-extrabold ${isFree ? "text-success" : "text-foreground"}`}>
                  {isFree ? "مجاني" : formatPrice(course.price, course.currency)}
                </span>
                {!isFree && <span className="text-sm text-muted-foreground">دفعة واحدة</span>}
              </div>

              {isEnrolled ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground font-semibold">تقدمك في الكورس</span>
                      <span className="text-primary font-bold">{enrollment!.progress_percentage}%</span>
                    </div>
                    <Progress value={enrollment!.progress_percentage} className="h-2.5" />
                  </div>
                  {firstLessonId && (
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/courses/${courseId}/lessons/${firstLessonId}`;
                      }}
                    >
                      {enrollment!.progress_percentage > 0 ? "أكمل التعلم ▶" : "ابدأ التعلم ▶"}
                    </Button>
                  )}
                </div>
              ) : isAdmin ? (
                <>
                  {firstLessonId && (
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/courses/${courseId}/lessons/${firstLessonId}`;
                      }}
                    >
                      دخول المدير ▶
                    </Button>
                  )}
                </>
              ) : isFree ? (
                <Button variant="hero" size="lg" className="w-full" onClick={handleEnrollFree} disabled={enrolling}>
                  {enrolling ? "جاري التسجيل..." : "ابدأ الآن مجاناً 🎉"}
                </Button>
              ) : (
                <div className="space-y-2.5">
                  <Button variant="hero" size="lg" className="w-full" onClick={handleBuyNow} disabled={checkoutLoading}>
                    {checkoutLoading ? "..." : `اشترِ الآن — ${formatPrice(course.price, course.currency)}`}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      if (!userId) {
                        navigate({ to: "/login" });
                        return;
                      }
                      if (isInCart(courseId)) navigate({ to: "/cart" });
                      else addToCart(courseId);
                    }}
                  >
                    {isInCart(courseId) ? "🛒 عرض السلة" : "🛒 أضف للسلة"}
                  </Button>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-border/60 space-y-3">
                <p className="text-xs font-semibold text-foreground mb-2">هذا الكورس يشمل:</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-base">📚</span>
                  <span>{totalLessons} درس تفاعلي</span>
                </div>
                {durationLabel && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-base">⏱</span>
                    <span>{durationLabel} من المحتوى</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-base">🏆</span>
                  <span>شهادة إتمام معتمدة</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-base">♾️</span>
                  <span>وصول مدى الحياة</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-base">📱</span>
                  <span>متاح على جميع الأجهزة</span>
                </div>
              </div>
            </aside>
          </div>

          <Tabs
            value={tab}
            onValueChange={setTab}
            className="bg-card rounded-2xl border border-border/60 p-5 sm:p-6 shadow-sm"
          >
            <TabsList className="w-full justify-start bg-secondary/50 p-1 rounded-xl h-auto flex-wrap">
              <TabsTrigger
                value="description"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                الوصف
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                المحتوى ({totalLessons})
              </TabsTrigger>
              {htmlQuizzes.length > 0 && (
                <TabsTrigger
                  value="quizzes"
                  className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  📝 اختبارات ({htmlQuizzes.length})
                </TabsTrigger>
              )}
              <TabsTrigger
                value="reviews"
                className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                التقييمات ({course.rating_count})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                {course.description || "لا يوجد وصف متاح لهذا الكورس بعد."}
              </p>
            </TabsContent>

            <TabsContent value="content" className="mt-6">
              <CourseContent
                courseId={courseId}
                chapters={[
                  ...(uncategorized.length > 0 ? [{ id: "_uncat", title: "دروس عامة", lessons: uncategorized }] : []),
                  ...chapters,
                ]}
                canAccess={canAccessLessons}
              />
              {!canAccessLessons && totalLessons > 0 && (
                <p className="text-center text-xs text-muted-foreground mt-4">🔒 سجّل في الكورس لمشاهدة كل الدروس</p>
              )}
            </TabsContent>

            <TabsContent value="quizzes" className="mt-6">
              {htmlQuizzes.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">لا توجد اختبارات</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {htmlQuizzes.map((q) => (
                    <Link
                      key={q.id}
                      to="/quizzes/$quizId"
                      params={{ quizId: q.id }}
                      className="bg-muted/30 hover:bg-muted/60 rounded-xl border border-border p-4 transition-colors block"
                    >
                      <h4 className="font-bold text-foreground mb-1">{q.title}</h4>
                      {q.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{q.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {q.difficulty === "easy" ? "🟢 سهل" : q.difficulty === "hard" ? "🔴 صعب" : "🟡 متوسط"}
                        </span>
                        <span>•</span>
                        <span>⏱ {q.estimated_minutes || 15} د</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6 space-y-6">
              {course.rating_count > 0 ? (
                <RatingDistribution ratings={allRatings} />
              ) : (
                <p className="text-center text-muted-foreground text-sm">لا توجد تقييمات بعد</p>
              )}

              {userId && canReview && (
                <ReviewForm courseId={courseId} userId={userId} existingReview={myReview} onSaved={reloadReviews} />
              )}
              {userId && !canReview && !myReview && (
                <div className="bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground text-center">
                  💡 يمكنك إضافة تقييم بعد إكمال 50% من الكورس على الأقل
                </div>
              )}

              <ReviewsList reviews={reviews} />
            </TabsContent>
          </Tabs>

          <SimilarCourses courseId={courseId} categoryIds={categoryIds} />
        </div>
      </div>
    </div>
  );
}
