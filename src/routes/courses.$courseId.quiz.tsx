import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { issueCertificateIfEligible } from "@/lib/issueCertificate";

export const Route = createFileRoute("/courses/$courseId/quiz")({
  head: () => ({ meta: [{ title: "اختبار الكورس — معلوم" }] }),
  component: QuizPage,
});

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  course_id: string;
}
interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  sort_order: number;
}

interface QuestionRow extends Omit<Question, "options"> {
  options: unknown;
}

interface AttemptSummary {
  score: number;
  passed: boolean;
}

// Fisher–Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courseTitle, setCourseTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [previousAttempt, setPreviousAttempt] = useState<{ score: number; passed: boolean } | null>(null);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/login" });
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", uid)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!enrollment) {
        toast.error("لازم تكون مسجّل في الكورس أولاً");
        navigate({ to: "/courses/$courseId", params: { courseId } });
        return;
      }

      const { data: courseData } = await supabase
        .from("courses").select("title").eq("id", courseId).single();
      setCourseTitle(courseData?.title || "");

      const { data: quizData } = await supabase
        .from("quizzes").select("*")
        .eq("course_id", courseId).eq("is_published", true)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();

      if (!quizData) { setLoading(false); return; }
      setQuiz(quizData as Quiz);

      const { data: qData } = await supabase
        .from("quiz_questions").select("*")
        .eq("quiz_id", quizData.id).order("sort_order");
      setQuestions((((qData as QuestionRow[] | null) || []).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      })) as Question[]));

      const { data: lastAttempt } = await supabase
        .from("quiz_attempts").select("score, passed")
        .eq("quiz_id", quizData.id).eq("user_id", uid)
        .order("completed_at", { ascending: false }).limit(1).maybeSingle();
      if (lastAttempt) setPreviousAttempt(lastAttempt as AttemptSummary);

      setLoading(false);
    };
    load();
  }, [courseId, navigate]);

  const orderedQuestions = useMemo(
    () => (shuffleQuestions ? shuffle(questions) : questions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [started, questions, shuffleQuestions]
  );

  // Timer: 1.5 min per question (rounded), capped at 60 minutes
  useEffect(() => {
    if (!started || result) return;
    const totalSec = Math.min(60 * 60, Math.max(60, Math.round(orderedQuestions.length * 90)));
    setSecondsLeft(totalSec);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null) return s;
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, result]);

  const handleSubmit = async (auto = false) => {
    if (!quiz || !userId) return;
    if (!auto && Object.keys(answers).length < orderedQuestions.length) {
      const missing = orderedQuestions.length - Object.keys(answers).length;
      if (!confirm(`لم تجب على ${missing} سؤال. هل تريد التسليم؟`)) return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    let correct = 0;
    orderedQuestions.forEach((q) => {
      if (answers[q.id] === q.correct_option) correct++;
    });
    const score = Math.round((correct / orderedQuestions.length) * 100);
    const passed = score >= quiz.passing_score;

    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: quiz.id,
      user_id: userId,
      score,
      passed,
      answers: orderedQuestions.map((q) => ({
        question_id: q.id,
        selected: answers[q.id] ?? null,
        correct: q.correct_option,
      })),
    });
    setSubmitting(false);

    if (error) { toast.error("فشل تسجيل المحاولة", { description: error.message }); return; }
    setResult({ score, passed });
    if (auto) toast.warning("انتهى الوقت - تم التسليم تلقائياً");
    if (passed) {
      toast.success(`نجحت بدرجة ${score}%! 🎉`);
      // Auto-issue certificate if eligible
      try {
        const cert = await issueCertificateIfEligible(userId, quiz.course_id, score);
        if (cert) {
          toast.success("🏅 تم إصدار شهادتك! تفقّدها في صفحة شهاداتي", {
            duration: 6000,
            action: {
              label: "عرض",
              onClick: () => navigate({ to: "/certificates" }),
            },
          });
        }
      } catch { /* silent */ }
    }
    else if (!auto) toast.error(`الدرجة: ${score}% — يلزم ${quiz.passing_score}% للنجاح`);
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    setStarted(false);
    setCurrentIdx(0);
    setReviewMode(false);
  };

  if (loading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-10 w-64" /><Skeleton className="h-40" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="container py-20 text-center">
        <div className="text-5xl mb-3">📝</div>
        <h1 className="text-xl font-bold mb-2">لا يوجد اختبار لهذا الكورس بعد</h1>
        <p className="text-muted-foreground mb-6">سيتم إضافة الاختبار قريباً من قبل المدرب.</p>
        <Button asChild variant="outline">
          <Link to="/courses/$courseId" params={{ courseId }}>← العودة للكورس</Link>
        </Button>
      </div>
    );
  }

  // Result + Review
  if (result) {
    if (reviewMode) {
      return (
        <div className="container py-8 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">📋 مراجعة الإجابات</h1>
            <Button variant="outline" size="sm" onClick={() => setReviewMode(false)}>← النتيجة</Button>
          </div>
          <div className="space-y-4">
            {orderedQuestions.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correct_option;
              return (
                <div key={q.id} className={`rounded-xl border-2 p-5 ${isCorrect ? "border-green-300 bg-green-50/50" : "border-red-300 bg-red-50/50"}`}>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xl">{isCorrect ? "✅" : "❌"}</span>
                    <h3 className="font-bold flex-1">
                      <span className="text-primary">{idx + 1}.</span> {q.question_text}
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {q.options.map((opt, i) => {
                      const isUserChoice = userAns === i;
                      const isCorrectChoice = q.correct_option === i;
                      return (
                        <div
                          key={i}
                          className={`p-2 rounded-md ${
                            isCorrectChoice ? "bg-green-100 text-green-800 font-medium" :
                            isUserChoice ? "bg-red-100 text-red-800" : "text-muted-foreground"
                          }`}
                        >
                          {isCorrectChoice && "✓ "}{isUserChoice && !isCorrectChoice && "✗ "}{opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="container py-12 max-w-2xl">
        <div className={`rounded-2xl border-2 p-8 text-center ${result.passed ? "border-green-500 bg-green-50" : "border-orange-400 bg-orange-50"}`}>
          <div className="text-6xl mb-4">{result.passed ? "🎉" : "📚"}</div>
          <h1 className="text-2xl font-bold mb-2">
            {result.passed ? "مبروك! نجحت في الاختبار" : "ما حصلت على درجة النجاح"}
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            درجتك: <span className="font-bold text-foreground">{result.score}%</span>
            {" · "}النجاح يبدأ من <span className="font-bold">{quiz.passing_score}%</span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="outline" onClick={() => setReviewMode(true)}>📋 مراجعة الإجابات</Button>
            {result.passed ? (
              <>
                <Button asChild variant="hero"><Link to="/my-courses">🎓 احصل على الشهادة</Link></Button>
                <Button asChild variant="outline">
                  <Link to="/courses/$courseId" params={{ courseId }}>← العودة للكورس</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="hero" onClick={handleRetry}>إعادة المحاولة</Button>
                <Button asChild variant="outline">
                  <Link to="/courses/$courseId" params={{ courseId }}>← مراجعة الدروس</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Intro screen
  if (!started) {
    return (
      <div className="container py-10 max-w-2xl">
        <Link to="/courses/$courseId" params={{ courseId }} className="text-sm text-muted-foreground hover:text-primary">
          ← {courseTitle}
        </Link>
        <div className="mt-6 bg-card rounded-2xl border border-border p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📝</div>
            <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
            <p className="text-muted-foreground">جاهز لاختبار معلوماتك؟</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{questions.length}</div>
              <div className="text-xs text-muted-foreground">سؤال</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{quiz.passing_score}%</div>
              <div className="text-xs text-muted-foreground">للنجاح</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">~{Math.max(2, Math.round(questions.length * 1.5))}د</div>
              <div className="text-xs text-muted-foreground">المدة</div>
            </div>
          </div>

          {previousAttempt && (
            <div className={`rounded-lg p-3 mb-6 text-sm text-center ${previousAttempt.passed ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
              محاولة سابقة: {previousAttempt.score}% — {previousAttempt.passed ? "نجاح" : "لم تنجح"}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="w-4 h-4"
            />
            🔀 خلط ترتيب الأسئلة (يُنصح به)
          </label>

          <Button variant="hero" className="w-full" onClick={() => setStarted(true)} disabled={questions.length === 0}>
            🚀 ابدأ الاختبار
          </Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPct = orderedQuestions.length > 0 ? Math.round((answeredCount / orderedQuestions.length) * 100) : 0;
  const currentQ = orderedQuestions[currentIdx];
  const mins = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const secs = secondsLeft !== null ? secondsLeft % 60 : 0;
  const timeLow = secondsLeft !== null && secondsLeft < 60;

  return (
    <div className="container py-6 max-w-3xl">
      {/* Top bar: timer + progress */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 mb-4 border-b">
        <div className="flex items-center justify-between text-sm mb-2 flex-wrap gap-2">
          <span className="text-muted-foreground">السؤال {currentIdx + 1} من {orderedQuestions.length}</span>
          <span className={`font-mono font-bold tabular-nums px-3 py-1 rounded-md ${timeLow ? "bg-red-100 text-red-700 animate-pulse" : "bg-primary/10 text-primary"}`}>
            ⏱ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground">أُجيب: {answeredCount}/{orderedQuestions.length}</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Question navigator pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {orderedQuestions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = i === currentIdx;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`w-8 h-8 rounded-md text-xs font-bold transition-colors ${
                isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30" :
                isAnswered ? "bg-green-100 text-green-700 hover:bg-green-200" :
                "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Current question */}
      {currentQ && (
        <div className="rounded-xl border border-border bg-card p-5 md:p-6">
          <h3 className="font-bold text-lg mb-5">
            <span className="text-primary">{currentIdx + 1}.</span> {currentQ.question_text}
          </h3>
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              const selected = answers[currentQ.id] === i;
              return (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${currentQ.id}`}
                    checked={selected}
                    onChange={() => setAnswers({ ...answers, [currentQ.id]: i })}
                    className="cursor-pointer"
                  />
                  <span className="text-sm flex-1">{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between gap-3 mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
        >
          ← السابق
        </Button>
        {currentIdx < orderedQuestions.length - 1 ? (
          <Button variant="hero" onClick={() => setCurrentIdx(currentIdx + 1)}>
            التالي →
          </Button>
        ) : (
          <Button variant="hero" onClick={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? "جاري التسليم..." : "✓ تسليم الاختبار"}
          </Button>
        )}
      </div>
    </div>
  );
}
