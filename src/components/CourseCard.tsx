import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/StarRating";
import { formatPrice } from "@/lib/currency";
import { Users, PlayCircle, Clock, BookOpen, ArrowLeft } from "lucide-react";

export interface CourseCardProps {
  courseId?: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  level: string;
  students: number;
  lessons: number;
  price: number | "مجاني";
  currency?: string;
  image: string;
  rating?: number;
  ratingCount?: number;
  isEnrolled?: boolean;
}

export function CourseCard({
  courseId,
  title,
  description,
  instructor,
  category,
  level,
  students,
  lessons,
  price,
  currency,
  image,
  rating = 0,
  ratingCount = 0,
  isEnrolled,
}: CourseCardProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const priceLabel = typeof price === "number" ? formatPrice(price, currency) : String(price);

  const isFree = price === "مجاني" || price === 0;

  const goToCourse = () => {
    if (!courseId) return;
    window.location.href = `/courses/${courseId}`;
  };

  const goToFirstLesson = async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!courseId) {
      console.error("[CourseCard] goToFirstLesson: courseId مفقود");
      return { ok: false, reason: "معرّف الكورس غير متوفر" };
    }
    console.log("[CourseCard] جاري جلب أول درس للكورس:", courseId);
    const { data: firstLesson, error } = await supabase
      .from("lessons")
      .select("id, title, is_published, sort_order")
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("sort_order")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[CourseCard] فشل استعلام الدروس:", error);
      return { ok: false, reason: `خطأ في قاعدة البيانات: ${error.message}` };
    }

    if (!firstLesson?.id) {
      console.warn("[CourseCard] لم يتم العثور على أي درس منشور لهذا الكورس:", courseId);
      return { ok: false, reason: "لا توجد دروس منشورة في هذا الكورس بعد" };
    }

    console.log("[CourseCard] الانتقال للدرس:", firstLesson);
    window.location.href = `/courses/${courseId}/lessons/${firstLesson.id}`;
    return { ok: true };
  };

  const handleStart = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!courseId) {
      navigate({ to: "/courses" });
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Not free + not logged in → send to login
      if (!isFree && !session) {
        toast.info("يجب تسجيل الدخول لشراء الكورس");
        navigate({ to: "/login" });
        return;
      }

      // Logged in → check actual enrollment status from DB (don't trust the prop)
      let alreadyEnrolled = false;
      if (session) {
        const { data: existing, error: enrollCheckErr } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("course_id", courseId)
          .maybeSingle();
        if (enrollCheckErr) {
          console.error("[CourseCard] فشل التحقق من التسجيل:", enrollCheckErr);
        }
        alreadyEnrolled = !!existing;

        // Free course + logged in but not enrolled → enroll now
        if (!alreadyEnrolled && isFree) {
          const { error: enrollErr } = await supabase
            .from("enrollments")
            .insert({ user_id: session.user.id, course_id: courseId });
          if (enrollErr) {
            console.error("[CourseCard] فشل التسجيل في الكورس المجاني:", enrollErr);
            toast.error("تعذّر تسجيلك في الكورس", { description: enrollErr.message });
          } else {
            alreadyEnrolled = true;
          }
        }
      }

      // Anyone with access (enrolled OR free preview) → go straight to first lesson
      if (alreadyEnrolled || isFree) {
        const result = await goToFirstLesson();
        if (result.ok) return;
        // فشل الانتقال للدرس — أظهر السبب وانتقل لصفحة الكورس
        toast.error("تعذّر فتح الدرس", {
          description: result.reason ?? "سبب غير معروف — راجع الـ Console",
        });
        console.warn("[CourseCard] الانتقال لصفحة الكورس بدلاً من الدرس. السبب:", result.reason);
      }

      // Fallback to course details
      goToCourse();
    } catch (err: unknown) {
      console.error("[CourseCard] handleStart error:", err);
      const message = err instanceof Error ? err.message : "خطأ غير متوقع";
      toast.error("حصل خطأ — جرّب تاني", { description: message });
      goToCourse();
    } finally {
      setLoading(false);
    }
  };

  const ctaLabel = loading
    ? "..."
    : isEnrolled
    ? "ادخل للكورس"
    : isFree
    ? "ابدأ التعلم"
    : `اشترك — ${priceLabel}`;

  return (
    <article
      className="group relative bg-card rounded-2xl border border-border/60 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_oklch(0.52_0.14_230_/_0.25)] hover:border-primary/30"
    >
      {/* Image */}
      <button
        onClick={handleStart}
        disabled={loading}
        className="relative h-48 overflow-hidden text-start disabled:opacity-70"
        aria-label={`فتح كورس ${title}`}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full gradient-hero flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/40" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/95 backdrop-blur-sm rounded-full p-3 shadow-xl scale-90 group-hover:scale-100 transition-transform">
            <PlayCircle className="w-7 h-7 text-primary" fill="currentColor" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute top-3 start-3 flex gap-2">
          <span className="bg-white/95 backdrop-blur-sm text-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {category}
          </span>
        </div>

        {/* Price badge */}
        <div className="absolute top-3 end-3">
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-md ${
              isFree
                ? "bg-success text-success-foreground"
                : "bg-gradient-to-r from-warm to-[oklch(0.75_0.18_60)] text-warm-foreground"
            }`}
          >
            {isFree ? "مجاني" : priceLabel}
          </span>
        </div>

        {/* Enrolled badge */}
        {isEnrolled && (
          <div className="absolute bottom-3 start-3">
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              مشترك
            </span>
          </div>
        )}

        {/* Level on image bottom */}
        <div className="absolute bottom-3 end-3">
          <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full">
            {level}
          </span>
        </div>
      </button>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <button onClick={handleStart} disabled={loading} className="text-start disabled:opacity-70">
          <h3 className="font-bold text-base text-card-foreground line-clamp-2 leading-snug min-h-[2.6rem] group-hover:text-primary transition-colors">
            {title}
          </h3>
        </button>

        {/* Description */}
        <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2 min-h-[2rem] leading-relaxed">
          {description}
        </p>

        {/* Rating */}
        <div className="mt-3 flex items-center gap-2">
          <StarRating value={rating} size="sm" readOnly />
          <span className="text-xs font-semibold text-foreground">
            {rating > 0 ? rating.toFixed(1) : "—"}
          </span>
          {ratingCount > 0 && (
            <span className="text-[11px] text-muted-foreground">({ratingCount} تقييم)</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-3">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {students.toLocaleString("ar-EG")}
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {lessons} درس
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
              {instructor?.charAt(0) || "م"}
            </div>
            <span className="text-xs font-medium text-muted-foreground truncate">
              {instructor || "معلوم"}
            </span>
          </div>
          <button
            onClick={handleStart}
            disabled={loading}
            className={`text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 px-3 py-1.5 rounded-lg ${
              isEnrolled
                ? "bg-primary/10 text-primary hover:bg-primary/20"
                : isFree
                ? "bg-success/10 text-success hover:bg-success/20"
                : "bg-warm/15 text-warm-foreground hover:bg-warm/25"
            }`}
          >
            {ctaLabel}
            {!loading && <ArrowLeft className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </article>
  );
}
