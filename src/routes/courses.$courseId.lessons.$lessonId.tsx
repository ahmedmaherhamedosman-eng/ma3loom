import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LessonSidebar, type SidebarChapter } from "@/components/LessonSidebar";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Menu,
  X,
  Clock,
  BookOpen,
  FileText,
  MessageCircle,
  Eye,
  PlayCircle,
  Trophy,
  Folder,
  File as FileIcon,
} from "lucide-react";
import { LessonComments } from "@/components/LessonComments";
import { issueCertificateIfEligible } from "@/lib/issueCertificate";

export const Route = createFileRoute("/courses/$courseId/lessons/$lessonId")({
  head: () => ({
    meta: [
      { title: "مشاهدة الدرس — معلوم" },
      { name: "description", content: "شاهد الدرس وتعلم مع منصة معلوم" },
    ],
  }),
  component: LessonViewerPage,
});

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  content: string | null;
  sort_order: number;
  duration_minutes: number | null;
  course_id: string;
  chapter_id: string | null;
  is_preview: boolean;
}

interface Resource {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
}

function getYouTubeEmbedUrl(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function getFileTypeColor(type: string | null) {
  const t = (type || "").toLowerCase();
  if (["pdf"].includes(t)) return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (["doc", "docx"].includes(t)) return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  if (["xls", "xlsx", "csv"].includes(t)) return "bg-green-500/10 text-green-600 dark:text-green-400";
  if (["zip", "rar", "7z"].includes(t)) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(t)) return "bg-pink-500/10 text-pink-600 dark:text-pink-400";
  if (["mp4", "mov", "webm"].includes(t)) return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
  return "bg-primary/10 text-primary";
}

function LessonViewerPage() {
  const { courseId, lessonId } = Route.useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [progressPct, setProgressPct] = useState(0);
  const [courseTitle, setCourseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const [autoCompleted, setAutoCompleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [commentsCount, setCommentsCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [courseRes, lessonRes, lessonsRes, chaptersRes, resourcesRes, commentsRes] = await Promise.all([
        supabase.from("courses").select("title, price, is_free").eq("id", courseId).single(),
        supabase.from("lessons").select("*").eq("id", lessonId).single(),
        supabase.from("lessons").select("*").eq("course_id", courseId).eq("is_published", true).order("sort_order"),
        supabase.from("chapters").select("id, title").eq("course_id", courseId).order("sort_order"),
        supabase.from("lesson_resources").select("*").eq("lesson_id", lessonId).order("sort_order"),
        supabase.from("lesson_comments").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId),
      ]);

      if (courseRes.data) setCourseTitle(courseRes.data.title);
      if (lessonRes.data) setLesson(lessonRes.data as Lesson);
      if (lessonsRes.data) setAllLessons(lessonsRes.data as Lesson[]);
      if (chaptersRes.data) setChapters(chaptersRes.data);
      if (resourcesRes.data) setResources(resourcesRes.data as Resource[]);
      setCommentsCount(commentsRes.count || 0);

      const isFree = courseRes.data?.is_free || courseRes.data?.price === 0;
      const isPreviewLesson = !!(lessonRes.data as any)?.is_preview;
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id || null;
      setUserId(uid);

      if (!isFree && !isPreviewLesson && !session) {
        navigate({ to: "/login" });
        return;
      }

      let isAdminLocal = false;
      let isEnrolledLocal = false;
      if (uid) {
        const [adminRes, enrollRes] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
          supabase.from("enrollments").select("id").eq("user_id", uid).eq("course_id", courseId).maybeSingle(),
        ]);
        isAdminLocal = !!adminRes.data;
        isEnrolledLocal = !!enrollRes.data;

        if (isFree && !isEnrolledLocal && !isAdminLocal) {
          const { error: enrollErr } = await supabase
            .from("enrollments")
            .insert({ user_id: uid, course_id: courseId });
          if (!enrollErr) isEnrolledLocal = true;
        }
      }
      setIsAdmin(isAdminLocal);
      setIsEnrolled(isEnrolledLocal);

      if (!isFree && !isPreviewLesson && !isAdminLocal && !isEnrolledLocal) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setResumeSeconds(0);
      setAutoCompleted(false);
      setActiveTab("overview");
      if (uid) {
        const [progRes, enrollProgRes, currentLessonProgRes] = await Promise.all([
          supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", uid).eq("course_id", courseId),
          supabase.from("enrollments").select("progress_percentage").eq("user_id", uid).eq("course_id", courseId).maybeSingle(),
          supabase.from("lesson_progress").select("watched_seconds, completed").eq("user_id", uid).eq("lesson_id", lessonId).maybeSingle(),
        ]);
        const completed = new Set<string>();
        (progRes.data || []).forEach((p: any) => p.completed && completed.add(p.lesson_id));
        setCompletedIds(completed);
        setProgressPct(enrollProgRes.data?.progress_percentage ?? 0);
        if (currentLessonProgRes.data && !currentLessonProgRes.data.completed) {
          setResumeSeconds(currentLessonProgRes.data.watched_seconds || 0);
        }

        if (isEnrolledLocal) {
          await supabase
            .from("enrollments")
            .update({ last_lesson_id: lessonId })
            .eq("user_id", uid)
            .eq("course_id", courseId);
        }
      }

      setLoading(false);
    };
    load();
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [courseId, lessonId, navigate]);

  // Auto-save watched_seconds every 10s for HTML5 videos
  useEffect(() => {
    if (!userId || !videoRef.current) return;
    saveIntervalRef.current = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.paused) return;
      const seconds = Math.floor(v.currentTime);
      if (seconds < 5) return;
      await supabase.from("lesson_progress").upsert(
        {
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          watched_seconds: seconds,
          last_watched_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
    }, 10000);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [userId, lessonId, courseId, lesson]);

  // Generate a signed URL for private lesson videos stored in Supabase
  useEffect(() => {
    setSignedVideoUrl(null);
    const url = lesson?.video_url;
    if (!url || !url.includes("/lesson-videos/")) return;
    const path = url.split("/lesson-videos/")[1]?.split("?")[0];
    if (!path) return;
    let cancelled = false;
    supabase.storage
      .from("lesson-videos")
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          console.error("Signed URL error:", error);
          return;
        }
        setSignedVideoUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [lesson?.video_url]);

  const markCompleteCore = async (markAs: boolean) => {
    if (!userId) return false;
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        course_id: courseId,
        completed: markAs,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
    if (error) return false;
    const next = new Set(completedIds);
    if (markAs) next.add(lessonId); else next.delete(lessonId);
    setCompletedIds(next);
    const { data } = await supabase
      .from("enrollments")
      .select("progress_percentage")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (data) {
      setProgressPct(data.progress_percentage);
      if (markAs && data.progress_percentage >= 100) {
        try {
          const cert = await issueCertificateIfEligible(userId, courseId);
          if (cert) {
            toast.success("🏅 تهانينا! تم إصدار شهادتك", {
              duration: 6000,
              action: {
                label: "عرض الشهادة",
                onClick: () => navigate({ to: "/certificates/$code", params: { code: cert.verification_code } }),
              },
            });
          }
        } catch { /* silent */ }
      }
    }
    return true;
  };

  const handleMarkComplete = async () => {
    if (!userId) {
      toast.info("سجّل دخولك لحفظ تقدمك");
      return;
    }
    setMarking(true);
    const isCompleted = completedIds.has(lessonId);
    const ok = await markCompleteCore(!isCompleted);
    if (!ok) toast.error("تعذر حفظ التقدم");
    else toast.success(isCompleted ? "تم إلغاء الإكمال" : "✓ أحسنت! درس مكتمل");
    setMarking(false);
  };

  const sidebarStructure = useMemo(() => {
    const uncat = allLessons
      .filter((l) => !l.chapter_id)
      .map((l) => ({
        id: l.id, title: l.title, duration_minutes: l.duration_minutes,
        completed: completedIds.has(l.id), is_preview: (l as any).is_preview,
      }));
    const built: SidebarChapter[] = chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      lessons: allLessons
        .filter((l) => l.chapter_id === ch.id)
        .map((l) => ({
          id: l.id, title: l.title, duration_minutes: l.duration_minutes,
          completed: completedIds.has(l.id), is_preview: (l as any).is_preview,
        })),
    }));
    return { built, uncat };
  }, [allLessons, chapters, completedIds]);

  if (accessDenied) {
    return (
      <div className="py-20 text-center px-4">
        <h1 className="text-2xl font-bold text-foreground mb-3">يجب شراء الكورس أولاً</h1>
        <p className="text-muted-foreground mb-6">هذا الكورس مدفوع — اشترِه لمشاهدة الدروس.</p>
        <Link to="/courses/$courseId" params={{ courseId }}>
          <Button variant="hero">صفحة الكورس</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8 mx-auto max-w-7xl px-4 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video rounded-2xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">الدرس غير موجود</h1>
        <Link to="/courses/$courseId" params={{ courseId }}>
          <Button variant="hero">العودة للكورس</Button>
        </Link>
      </div>
    );
  }

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prev = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const next = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const completed = completedIds.has(lessonId);
  const embedUrl = lesson.video_url ? getYouTubeEmbedUrl(lesson.video_url) : null;
  const isSupabaseVideo = !!lesson.video_url && lesson.video_url.includes("/lesson-videos/");
  const totalLessons = allLessons.length;
  const completedCount = completedIds.size;
  const currentChapter = lesson.chapter_id ? chapters.find((c) => c.id === lesson.chapter_id) : null;

  return (
    <div className="min-h-[80vh] flex relative bg-gradient-to-b from-secondary/20 via-background to-background">
      {/* Main Column */}
      <div className="flex-1 min-w-0 lg:me-80">
        {/* Sticky Header: Breadcrumb + Progress */}
        <div className="sticky top-16 z-20 bg-card/95 backdrop-blur-md border-b border-border/60 px-4 sm:px-6 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ms-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="القائمة"
            >
              <Menu size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-0.5 truncate">
                <Link to="/courses" className="hover:text-primary transition-colors">الكورسات</Link>
                <span>›</span>
                <Link to="/courses/$courseId" params={{ courseId }} className="hover:text-primary transition-colors truncate max-w-[150px]">
                  {courseTitle}
                </Link>
                {currentChapter && (
                  <>
                    <span>›</span>
                    <span className="truncate max-w-[100px]">{currentChapter.title}</span>
                  </>
                )}
              </nav>
              <h2 className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                {completed && <CheckCircle2 size={14} className="text-success shrink-0" />}
                {lesson.title}
              </h2>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 min-w-[140px]">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{completedCount}/{totalLessons}</span>
                <span className="font-bold text-primary tabular-nums">{progressPct}%</span>
              </div>
              <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-hero transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
          {/* Video Player */}
          <div className="relative aspect-video bg-foreground/5 rounded-2xl overflow-hidden mb-4 shadow-2xl shadow-primary/10 ring-1 ring-border/50">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
            ) : lesson.video_url ? (
              <video
                ref={videoRef}
                src={isSupabaseVideo ? (signedVideoUrl ?? undefined) : lesson.video_url}
                controls
                playsInline
                preload="metadata"
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                onError={(e) => {
                  console.error("Video error:", e.currentTarget.error);
                  toast.error("تعذر تشغيل الفيديو", {
                    description: "تأكد من اتصال الإنترنت أو جرّب تحديث الصفحة",
                  });
                }}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (resumeSeconds > 5 && v.duration && resumeSeconds < v.duration - 5) {
                    v.currentTime = resumeSeconds;
                  }
                }}
                onEnded={async () => {
                  if (userId && !autoCompleted && !completedIds.has(lessonId)) {
                    setAutoCompleted(true);
                    await markCompleteCore(true);
                    toast.success("✓ درس مكتمل — جاري الانتقال للدرس التالي...");
                  }
                  const idx = allLessons.findIndex((l) => l.id === lessonId);
                  const nx = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
                  if (nx) {
                    setTimeout(() => {
                      navigate({
                        to: "/courses/$courseId/lessons/$lessonId",
                        params: { courseId, lessonId: nx.id },
                      });
                    }, 1500);
                  }
                }}
                className="w-full h-full bg-black"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gradient-hero text-primary-foreground gap-3">
                <PlayCircle size={48} className="opacity-80" />
                <p className="text-lg font-semibold">الفيديو قيد التحضير</p>
                <p className="text-xs opacity-80">يمكنك متابعة المحتوى المكتوب أدناه</p>
              </div>
            )}
            {/* Status badge over video */}
            {completed && (
              <div className="absolute top-3 end-3 bg-success text-success-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
                <CheckCircle2 size={14} /> مكتمل
              </div>
            )}
          </div>

          {/* Quick Info Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <BookOpen size={12} />
              الدرس {currentIndex + 1} من {totalLessons}
            </span>
            {lesson.duration_minutes && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-muted text-foreground/80 px-3 py-1.5 rounded-full">
                <Clock size={12} />
                {lesson.duration_minutes} دقيقة
              </span>
            )}
            {currentChapter && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent/15 text-warm-foreground px-3 py-1.5 rounded-full">
                <Folder size={12} />
                {currentChapter.title}
              </span>
            )}
            {lesson.is_preview && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-success/15 text-success px-3 py-1.5 rounded-full">
                <Eye size={12} /> معاينة مجانية
              </span>
            )}
          </div>

          {/* Title + Mark Complete */}
          <div className="flex items-start justify-between gap-3 mb-6 flex-wrap pb-5 border-b border-border/60">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                {lesson.title}
              </h1>
            </div>
            {userId && (
              <Button
                variant={completed ? "outline" : "hero"}
                size="lg"
                onClick={handleMarkComplete}
                disabled={marking}
                className={completed ? "border-success/50 text-success hover:bg-success/10" : ""}
              >
                <CheckCircle2 size={18} className={completed ? "text-success" : ""} />
                {completed ? "تم الإكمال ✓" : "تعليم كمكتمل"}
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap gap-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                <BookOpen size={14} />
                نظرة عامة
              </TabsTrigger>
              {lesson.content && (
                <TabsTrigger value="content" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                  <FileText size={14} />
                  المحتوى التفصيلي
                </TabsTrigger>
              )}
              <TabsTrigger value="resources" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                <Download size={14} />
                الملفات
                {resources.length > 0 && (
                  <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {resources.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="discussion" className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                <MessageCircle size={14} />
                النقاش
                {commentsCount > 0 && (
                  <span className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {commentsCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-5">
              <div className="bg-card rounded-xl border border-border/60 p-6 space-y-5">
                {lesson.description ? (
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                      <BookOpen size={16} className="text-primary" />
                      وصف الدرس
                    </h3>
                    <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
                      {lesson.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    لا يوجد وصف لهذا الدرس — انتقل لتبويب "المحتوى التفصيلي" أو ابدأ المشاهدة.
                  </p>
                )}

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border/60">
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <div className="text-2xl font-bold text-primary tabular-nums">{currentIndex + 1}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">رقم الدرس</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <div className="text-2xl font-bold text-foreground tabular-nums">
                      {lesson.duration_minutes || "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">دقيقة</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <div className="text-2xl font-bold text-success tabular-nums">{completedCount}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">مكتمل</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <div className="text-2xl font-bold text-warm-foreground tabular-nums">{progressPct}%</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">تقدمك</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Content Tab */}
            {lesson.content && (
              <TabsContent value="content" className="mt-5">
                <article className="bg-card rounded-xl border border-border/60 p-6 md:p-8">
                  <div className="prose prose-sm md:prose-base max-w-none">
                    <p className="whitespace-pre-line text-foreground/90 leading-loose">
                      {lesson.content}
                    </p>
                  </div>
                </article>
              </TabsContent>
            )}

            {/* Resources Tab */}
            <TabsContent value="resources" className="mt-5">
              <div className="bg-card rounded-xl border border-border/60 p-6">
                {resources.length === 0 ? (
                  <div className="text-center py-10">
                    <FileIcon size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground text-sm">لا توجد ملفات مرفقة لهذا الدرس</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {resources.map((r) => (
                      <a
                        key={r.id}
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="group flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-background/50 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all"
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${getFileTypeColor(r.file_type)}`}>
                          <FileIcon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {r.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground uppercase mt-0.5">
                            {r.file_type || "ملف"}
                          </p>
                        </div>
                        <Download size={18} className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Discussion Tab */}
            <TabsContent value="discussion" className="mt-5">
              <div className="bg-card rounded-xl border border-border/60 p-6">
                <LessonComments
                  lessonId={lessonId}
                  courseId={courseId}
                  userId={userId}
                  isAdmin={isAdmin}
                  isEnrolled={isEnrolled}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Prev/Next Navigation Cards */}
          <div className="grid sm:grid-cols-2 gap-3 pt-6 mt-2 border-t border-border/60">
            {prev ? (
              <Link
                to="/courses/$courseId/lessons/$lessonId"
                params={{ courseId, lessonId: prev.id }}
                className="group flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                <div className="min-w-0 flex-1 text-start">
                  <p className="text-[11px] text-muted-foreground font-semibold mb-0.5">الدرس السابق</p>
                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {prev.title}
                  </p>
                  {prev.duration_minutes && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">⏱ {prev.duration_minutes} دقيقة</p>
                  )}
                </div>
              </Link>
            ) : (
              <div />
            )}

            {next ? (
              <Link
                to="/courses/$courseId/lessons/$lessonId"
                params={{ courseId, lessonId: next.id }}
                className="group flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-gradient-to-l from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 transition-all sm:col-start-2"
              >
                <div className="min-w-0 flex-1 text-end">
                  <p className="text-[11px] text-primary font-semibold mb-0.5">الدرس التالي</p>
                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {next.title}
                  </p>
                  {next.duration_minutes && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">⏱ {next.duration_minutes} دقيقة</p>
                  )}
                </div>
                <ChevronLeft size={20} className="text-primary shrink-0" />
              </Link>
            ) : (
              <Link
                to="/courses/$courseId"
                params={{ courseId }}
                className="group flex items-center gap-3 p-4 rounded-xl border border-success/30 bg-gradient-to-l from-success/10 to-success/5 hover:from-success/15 hover:to-success/10 transition-all sm:col-start-2"
              >
                <div className="min-w-0 flex-1 text-end">
                  <p className="text-[11px] text-success font-semibold mb-0.5">🎉 أنهيت الكورس</p>
                  <p className="font-semibold text-sm text-foreground group-hover:text-success transition-colors">
                    العودة لصفحة الكورس
                  </p>
                </div>
                <Trophy size={20} className="text-success shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <button
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق"
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 end-0 w-80 bg-card border-s border-border z-40 transition-transform ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        } lg:translate-x-0`}
      >
        <button
          className="lg:hidden absolute top-2 start-2 p-2 rounded-lg hover:bg-muted z-10"
          onClick={() => setSidebarOpen(false)}
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>
        <LessonSidebar
          courseId={courseId}
          currentLessonId={lessonId}
          chapters={sidebarStructure.built}
          uncategorized={sidebarStructure.uncat}
          progressPct={progressPct}
          completedCount={completedCount}
          totalCount={totalLessons}
        />
      </aside>
    </div>
  );
}
