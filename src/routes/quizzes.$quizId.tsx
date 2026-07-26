import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/quizzes/$quizId")({
  head: () => ({
    meta: [
      { title: "اختبار تفاعلي — معلوم" },
    ],
  }),
  component: QuizPlayPage,
});

type Quiz = Tables<"html_quizzes">;

const CATEGORIES: Record<string, string> = {
  general: "عام", math: "رياضيات", science: "علوم",
  language: "لغات", programming: "برمجة", history: "تاريخ", religion: "تربية إسلامية",
};

const DIFF: Record<string, { label: string; emoji: string }> = {
  easy: { label: "سهل", emoji: "🟢" },
  medium: { label: "متوسط", emoji: "🟡" },
  hard: { label: "صعب", emoji: "🔴" },
};

function QuizPlayPage() {
  const { quizId } = Route.useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error: err } = await supabase
        .from("html_quizzes")
        .select("*")
        .eq("id", quizId)
        .maybeSingle();
      if (err || !data) {
        setError("الاختبار غير متاح أو لا تملك صلاحية الوصول.");
        setLoading(false);
        return;
      }
      setQuiz(data as Quiz);
      // Increment attempts counter (best-effort)
      supabase.from("html_quizzes")
        .update({ attempts_count: (data.attempts_count || 0) + 1 })
        .eq("id", quizId)
        .then(() => {});
      setLoading(false);
    };
    load();
  }, [quizId]);

  if (loading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container py-20 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-xl font-bold mb-2">{error || "الاختبار غير موجود"}</h1>
        <p className="text-muted-foreground mb-6">قد تحتاج لتسجيل الدخول أو الاشتراك في الكورس المرتبط.</p>
        <div className="flex gap-3 justify-center">
          <Button asChild variant="hero"><Link to="/quizzes">← كل الاختبارات</Link></Button>
          <Button asChild variant="outline"><Link to="/login">تسجيل الدخول</Link></Button>
        </div>
      </div>
    );
  }

  // Build the iframe source
  let iframeSrc: string | null = null;
  let iframeSrcDoc: string | null = null;

  if (quiz.source_type === "url" && quiz.external_url) {
    iframeSrc = quiz.external_url;
  } else if (quiz.source_type === "file" && quiz.html_file_path) {
    const { data } = supabase.storage.from("html-quizzes").getPublicUrl(quiz.html_file_path);
    iframeSrc = data.publicUrl;
  } else if (quiz.source_type === "code" && quiz.html_content) {
    iframeSrcDoc = quiz.html_content;
  }

  const diff = DIFF[quiz.difficulty] || DIFF.medium;

  if (started) {
    return (
      <div className={`${fullscreen ? "fixed inset-0 z-50 bg-background" : "container py-6"}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { setStarted(false); setFullscreen(false); }}
              className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-sm hover:bg-muted/80 shrink-0"
            >
              ← رجوع
            </button>
            <h1 className="font-bold text-foreground truncate">{quiz.title}</h1>
          </div>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 shrink-0"
          >
            {fullscreen ? "🗙 خروج ملء الشاشة" : "⛶ ملء الشاشة"}
          </button>
        </div>
        <div className={`${fullscreen ? "h-[calc(100vh-60px)]" : "h-[80vh]"} bg-card rounded-2xl overflow-hidden border border-border shadow-lg`}>
          {iframeSrc && (
            <iframe
              src={iframeSrc}
              title={quiz.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="w-full h-full border-0"
            />
          )}
          {iframeSrcDoc && (
            <iframe
              srcDoc={iframeSrcDoc}
              title={quiz.title}
              sandbox="allow-scripts allow-forms allow-popups"
              className="w-full h-full border-0"
            />
          )}
          {!iframeSrc && !iframeSrcDoc && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              لا يوجد محتوى متاح
            </div>
          )}
        </div>
      </div>
    );
  }

  // Intro screen
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <Link to="/quizzes" className="text-sm text-muted-foreground hover:text-primary">
          ← كل الاختبارات
        </Link>

        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {quiz.image_url ? (
                <img src={quiz.image_url} alt={quiz.title} className="w-full h-56 md:h-72 object-cover" />
              ) : (
                <div className="w-full h-56 md:h-72 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center text-8xl">📝</div>
              )}
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {CATEGORIES[quiz.category] || quiz.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-muted text-foreground px-2 py-1 rounded-full">
                    {diff.emoji} {diff.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    ⏱ ~{quiz.estimated_minutes} دقيقة
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{quiz.title}</h1>
                {quiz.description && (
                  <p className="text-muted-foreground leading-relaxed">{quiz.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h2 className="font-bold text-foreground mb-4">قبل أن تبدأ</h2>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex gap-2"><span>✅</span><span>اقرأ كل سؤال بتأنٍّ قبل الإجابة</span></li>
                <li className="flex gap-2"><span>⏱</span><span>المدة المقترحة {quiz.estimated_minutes} دقيقة</span></li>
                <li className="flex gap-2"><span>🌐</span><span>تأكد من اتصال جيد بالإنترنت</span></li>
                <li className="flex gap-2"><span>🔇</span><span>اختر مكاناً هادئاً للتركيز</span></li>
              </ul>
              <Button variant="hero" className="w-full" onClick={() => setStarted(true)}>
                ابدأ الاختبار 🚀
              </Button>
              <button
                onClick={() => navigate({ to: "/quizzes" })}
                className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground py-2"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
