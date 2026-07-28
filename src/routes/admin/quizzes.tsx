import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/quizzes")({
  head: () => ({ meta: [{ title: "إدارة الاختبارات — معلوم" }] }),
  component: AdminQuizzes,
});

interface Course { id: string; title: string; }
interface Quiz {
  id: string;
  course_id: string;
  title: string;
  passing_score: number;
  is_published: boolean;
}
interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  sort_order: number;
}

interface QuestionRow extends Omit<Question, "options"> {
  options: unknown;
}

function AdminQuizzes() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizPass, setNewQuizPass] = useState(70);

  const load = async () => {
    setLoading(true);
    const [{ data: cData }, { data: qData }, { data: questionsData }] = await Promise.all([
      supabase.from("courses").select("id, title").order("created_at", { ascending: false }),
      supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
      supabase.from("quiz_questions").select("*").order("sort_order"),
    ]);
    setCourses(cData || []);
    setQuizzes((qData || []) as Quiz[]);
    const map: Record<string, Question[]> = {};
    (((questionsData as QuestionRow[] | null) || [])).forEach((q) => {
      if (!map[q.quiz_id]) map[q.quiz_id] = [];
      map[q.quiz_id].push({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      });
    });
    setQuestions(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreateQuiz = async () => {
    if (!selectedCourseId || !newQuizTitle.trim()) {
      return toast.error("اختر الكورس وأدخل اسم الاختبار");
    }
    const { error } = await supabase.from("quizzes").insert({
      course_id: selectedCourseId,
      title: newQuizTitle,
      passing_score: newQuizPass,
      is_published: false,
    });
    if (error) return toast.error("فشل الإنشاء", { description: error.message });
    toast.success("تم إنشاء الاختبار");
    setCreatingQuiz(false);
    setNewQuizTitle("");
    setNewQuizPass(70);
    load();
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("حذف هذا الاختبار وكل أسئلته؟")) return;
    await supabase.from("quiz_questions").delete().eq("quiz_id", id);
    await supabase.from("quizzes").delete().eq("id", id);
    toast.success("تم الحذف");
    load();
  };

  const handleTogglePublish = async (q: Quiz) => {
    if (!q.is_published && (!questions[q.id] || questions[q.id].length === 0)) {
      return toast.error("أضف سؤال واحد على الأقل قبل النشر");
    }
    await supabase.from("quizzes").update({ is_published: !q.is_published }).eq("id", q.id);
    toast.success(q.is_published ? "تم إخفاء الاختبار" : "تم نشر الاختبار");
    load();
  };

  const handleUpdatePassingScore = async (q: Quiz, score: number) => {
    await supabase.from("quizzes").update({ passing_score: score }).eq("id", q.id);
    load();
  };

  const handleAddQuestion = async (quizId: string) => {
    const order = (questions[quizId]?.length || 0);
    const { error } = await supabase.from("quiz_questions").insert({
      quiz_id: quizId,
      question_text: "سؤال جديد",
      options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      correct_option: 0,
      sort_order: order,
    });
    if (error) return toast.error("فشل الإضافة", { description: error.message });
    load();
  };

  const handleSaveQuestion = async (q: Question, patch: Partial<Question>) => {
    const updated = { ...q, ...patch };
    const { error } = await supabase
      .from("quiz_questions")
      .update({
        question_text: updated.question_text,
        options: updated.options,
        correct_option: updated.correct_option,
      })
      .eq("id", q.id);
    if (error) return toast.error("فشل الحفظ", { description: error.message });
    setQuestions((prev) => ({
      ...prev,
      [q.quiz_id]: prev[q.quiz_id].map((x) => (x.id === q.id ? updated : x)),
    }));
  };

  const handleDeleteQuestion = async (q: Question) => {
    if (!confirm("حذف هذا السؤال؟")) return;
    await supabase.from("quiz_questions").delete().eq("id", q.id);
    load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الاختبارات والشهادات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            أنشئ اختباراً نهائياً لكل كورس. عند نجاح الطالب يحصل على شهادة PDF تلقائياً.
          </p>
        </div>
        <Button variant="hero" onClick={() => setCreatingQuiz((v) => !v)}>
          {creatingQuiz ? "إلغاء" : "+ اختبار جديد"}
        </Button>
      </div>

      {creatingQuiz && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6 space-y-4">
          <h2 className="text-lg font-bold">إنشاء اختبار جديد</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>الكورس *</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger><SelectValue placeholder="اختر كورس..." /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>درجة النجاح (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newQuizPass}
                onChange={(e) => setNewQuizPass(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label>عنوان الاختبار *</Label>
              <Input
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                placeholder="مثال: اختبار نهاية كورس الرياضيات"
              />
            </div>
          </div>
          <Button variant="hero" onClick={handleCreateQuiz}>إنشاء</Button>
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-muted-foreground">لا يوجد اختبارات بعد. ابدأ بإضافة اختبار جديد.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => {
            const qList = questions[quiz.id] || [];
            return (
              <div key={quiz.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-foreground">{quiz.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      الكورس: {courseTitle(quiz.course_id)} • {qList.length} سؤال
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">نجاح ≥</span>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={quiz.passing_score}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== quiz.passing_score) handleUpdatePassingScore(quiz, v);
                        }}
                        className="w-20 h-8"
                      />
                      <span>%</span>
                    </div>
                    <Button
                      size="sm"
                      variant={quiz.is_published ? "outline" : "hero"}
                      onClick={() => handleTogglePublish(quiz)}
                    >
                      {quiz.is_published ? "إخفاء" : "نشر"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteQuiz(quiz.id)}>
                      🗑️ حذف
                    </Button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {qList.map((q, idx) => (
                    <QuestionEditor
                      key={q.id}
                      question={q}
                      index={idx}
                      onSave={(patch) => handleSaveQuestion(q, patch)}
                      onDelete={() => handleDeleteQuestion(q)}
                    />
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => handleAddQuestion(quiz.id)}>
                    + إضافة سؤال
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  onSave,
  onDelete,
}: {
  question: Question;
  index: number;
  onSave: (patch: Partial<Question>) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(question.question_text);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correct, setCorrect] = useState<number>(question.correct_option);

  useEffect(() => {
    setText(question.question_text);
    setOptions(question.options);
    setCorrect(question.correct_option);
  }, [question.question_text, question.options, question.correct_option]);

  const dirty =
    text !== question.question_text ||
    correct !== question.correct_option ||
    JSON.stringify(options) !== JSON.stringify(question.options);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground">سؤال #{index + 1}</span>
        <div className="flex gap-2">
          {dirty && (
            <Button
              size="sm"
              variant="hero"
              onClick={() => onSave({ question_text: text, options, correct_option: correct })}
            >
              حفظ
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDelete}>🗑️</Button>
        </div>
      </div>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="نص السؤال" />
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={correct === i}
              onChange={() => setCorrect(i)}
              className="cursor-pointer"
            />
            <Input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              placeholder={`الخيار ${i + 1}`}
            />
            {options.length > 2 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = options.filter((_, x) => x !== i);
                  setOptions(next);
                  if (correct === i) setCorrect(0);
                  else if (correct > i) setCorrect(correct - 1);
                }}
              >
                ✕
              </Button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOptions([...options, `الخيار ${options.length + 1}`])}
          >
            + خيار
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">حدّد الإجابة الصحيحة بالضغط على الدائرة بجوارها</p>
    </div>
  );
}
