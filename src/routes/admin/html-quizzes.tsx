import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/html-quizzes")({
  head: () => ({ meta: [{ title: "إدارة اختبارات HTML — معلوم" }] }),
  component: AdminHtmlQuizzes,
});

type HtmlQuiz = Tables<"html_quizzes">;
type Course = Pick<Tables<"courses">, "id" | "title">;

const CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "math", label: "رياضيات" },
  { value: "science", label: "علوم" },
  { value: "language", label: "لغات" },
  { value: "programming", label: "برمجة" },
  { value: "history", label: "تاريخ" },
  { value: "religion", label: "تربية إسلامية" },
];

const DIFFICULTIES = [
  { value: "easy", label: "سهل", emoji: "🟢" },
  { value: "medium", label: "متوسط", emoji: "🟡" },
  { value: "hard", label: "صعب", emoji: "🔴" },
];

const ACCESS_TYPES = [
  { value: "public", label: "🌍 عام (للجميع)", desc: "متاح حتى للزوار غير المسجلين" },
  { value: "authenticated", label: "🔐 المسجلون فقط", desc: "أي مستخدم سجل دخول" },
  { value: "course_enrolled", label: "🎓 طلاب الكورس فقط", desc: "يجب اختيار كورس" },
];

const SOURCE_TYPES = [
  { value: "file", label: "📁 رفع ملف HTML", desc: ".html ملف من جهازك" },
  { value: "code", label: "💻 لصق كود HTML", desc: "اكتب/الصق الكود مباشرة" },
  { value: "url", label: "🔗 رابط خارجي", desc: "صفحة مستضافة في مكان آخر" },
];

function AdminHtmlQuizzes() {
  const [quizzes, setQuizzes] = useState<HtmlQuiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general",
    difficulty: "medium",
    estimated_minutes: 15,
    image_url: "",
    source_type: "file" as "file" | "code" | "url",
    html_content: "",
    html_file_path: "",
    external_url: "",
    course_id: "",
    access_type: "public" as "public" | "authenticated" | "course_enrolled",
    is_published: true,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: q }, { data: c }] = await Promise.all([
      supabase.from("html_quizzes").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title").order("title"),
    ]);
    setQuizzes(q || []);
    setCourses(c || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      title: "", description: "", category: "general", difficulty: "medium",
      estimated_minutes: 15, image_url: "", source_type: "file",
      html_content: "", html_file_path: "", external_url: "",
      course_id: "", access_type: "public", is_published: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (q: HtmlQuiz) => {
    setForm({
      title: q.title,
      description: q.description || "",
      category: q.category,
      difficulty: q.difficulty,
      estimated_minutes: q.estimated_minutes || 15,
      image_url: q.image_url || "",
      source_type: q.source_type as "file" | "code" | "url",
      html_content: q.html_content || "",
      html_file_path: q.html_file_path || "",
      external_url: q.external_url || "",
      course_id: q.course_id || "",
      access_type: q.access_type as "public" | "authenticated" | "course_enrolled",
      is_published: q.is_published,
    });
    setEditingId(q.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      toast.error("يجب أن يكون الملف بصيغة .html");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الملف أقصاه 5 ميجابايت");
      return;
    }
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("html-quizzes").upload(path, file, {
      contentType: "text/html",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error("فشل رفع الملف: " + error.message);
      return;
    }
    setForm({ ...form, html_file_path: path });
    toast.success("تم رفع ملف الاختبار");
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("أدخل عنوان الاختبار"); return; }
    if (form.source_type === "file" && !form.html_file_path) { toast.error("ارفع ملف HTML"); return; }
    if (form.source_type === "code" && !form.html_content.trim()) { toast.error("الصق كود HTML"); return; }
    if (form.source_type === "url" && !form.external_url.trim()) { toast.error("أدخل الرابط الخارجي"); return; }
    if (form.access_type === "course_enrolled" && !form.course_id) {
      toast.error("لاختبار خاص بكورس، يجب اختيار الكورس"); return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      difficulty: form.difficulty,
      estimated_minutes: form.estimated_minutes,
      image_url: form.image_url.trim() || null,
      source_type: form.source_type,
      html_content: form.source_type === "code" ? form.html_content : null,
      html_file_path: form.source_type === "file" ? form.html_file_path : null,
      external_url: form.source_type === "url" ? form.external_url.trim() : null,
      course_id: form.course_id || null,
      access_type: form.access_type,
      is_published: form.is_published,
    };

    const { error } = editingId
      ? await supabase.from("html_quizzes").update(payload).eq("id", editingId)
      : await supabase.from("html_quizzes").insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "تم تحديث الاختبار" : "تم إضافة الاختبار");
    resetForm();
    load();
  };

  const togglePublish = async (q: HtmlQuiz) => {
    const { error } = await supabase.from("html_quizzes")
      .update({ is_published: !q.is_published }).eq("id", q.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async (q: HtmlQuiz) => {
    if (!confirm(`حذف اختبار "${q.title}"؟`)) return;
    if (q.html_file_path) {
      await supabase.storage.from("html-quizzes").remove([q.html_file_path]);
    }
    const { error } = await supabase.from("html_quizzes").delete().eq("id", q.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📝 اختبارات HTML</h1>
          <p className="text-sm text-muted-foreground">أضف اختبارات تفاعلية بصيغة HTML للطلاب</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            + اختبار جديد
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-foreground text-lg">
            {editingId ? "تعديل الاختبار" : "اختبار جديد"}
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">العنوان *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder="مثال: اختبار قواعد اللغة"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">التصنيف</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              placeholder="وصف موجز عن الاختبار وما يقيسه"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المستوى</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.emoji} {d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المدة (دقيقة)</label>
              <input
                type="number"
                min={1}
                max={300}
                value={form.estimated_minutes}
                onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">صورة الغلاف</label>
              <input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder="https://..."
                dir="ltr"
              />
            </div>
          </div>

          {/* Source type */}
          <div>
            <label className="block text-sm font-medium mb-2">طريقة الإضافة *</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {SOURCE_TYPES.map((s) => (
                <label key={s.value} className="cursor-pointer">
                  <input
                    type="radio"
                    checked={form.source_type === s.value}
                    onChange={() => setForm({ ...form, source_type: s.value as any })}
                    className="sr-only peer"
                  />
                  <div className="p-3 rounded-lg border-2 border-input peer-checked:border-primary peer-checked:bg-primary/5">
                    <div className="font-medium text-sm">{s.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {form.source_type === "file" && (
            <div>
              <label className="block text-sm font-medium mb-1">ملف HTML *</label>
              <input
                type="file"
                accept=".html,.htm"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full text-sm file:me-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary"
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1">جارٍ الرفع...</p>}
              {form.html_file_path && (
                <p className="text-xs text-green-600 mt-1">✓ تم الرفع: {form.html_file_path}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">الحد الأقصى 5 ميجابايت. يدعم HTML/CSS/JS كاملاً.</p>
            </div>
          )}

          {form.source_type === "code" && (
            <div>
              <label className="block text-sm font-medium mb-1">كود HTML *</label>
              <textarea
                value={form.html_content}
                onChange={(e) => setForm({ ...form, html_content: e.target.value })}
                rows={12}
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background font-mono text-xs"
                placeholder={`<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><title>اختبار</title></head>\n<body>\n  <h1>سؤال 1</h1>\n  ...\n</body>\n</html>`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                يُعرض داخل iframe معزول (sandbox) لحماية الموقع.
              </p>
            </div>
          )}

          {form.source_type === "url" && (
            <div>
              <label className="block text-sm font-medium mb-1">الرابط الخارجي *</label>
              <input
                value={form.external_url}
                onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder="https://example.com/quiz.html"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                تأكد أن الموقع يسمح بالعرض داخل iframe (X-Frame-Options).
              </p>
            </div>
          )}

          {/* Access */}
          <div>
            <label className="block text-sm font-medium mb-2">من يستطيع الوصول *</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {ACCESS_TYPES.map((a) => (
                <label key={a.value} className="cursor-pointer">
                  <input
                    type="radio"
                    checked={form.access_type === a.value}
                    onChange={() => setForm({ ...form, access_type: a.value as any })}
                    className="sr-only peer"
                  />
                  <div className="p-3 rounded-lg border-2 border-input peer-checked:border-primary peer-checked:bg-primary/5">
                    <div className="font-medium text-sm">{a.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              مرتبط بكورس {form.access_type === "course_enrolled" && <span className="text-destructive">*</span>}
            </label>
            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            >
              <option value="">— غير مرتبط —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="w-4 h-4"
            />
            منشور (مرئي للمستخدمين)
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              {editingId ? "حفظ التعديلات" : "إضافة الاختبار"}
            </button>
            <button
              onClick={resetForm}
              className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Quizzes list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">جارٍ التحميل...</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center bg-card border border-border rounded-2xl p-12">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-muted-foreground">لا توجد اختبارات HTML بعد. أضف أول اختبار!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => {
            const courseTitle = courses.find((c) => c.id === q.course_id)?.title;
            const diff = DIFFICULTIES.find((d) => d.value === q.difficulty);
            return (
              <div key={q.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {q.image_url && (
                  <img src={q.image_url} alt={q.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground line-clamp-1">{q.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${q.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {q.is_published ? "منشور" : "مخفي"}
                    </span>
                  </div>
                  {q.description && <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{diff?.emoji} {diff?.label}</span>
                    <span>•</span>
                    <span>⏱ {q.estimated_minutes} د</span>
                    <span>•</span>
                    <span>{q.source_type === "file" ? "📁" : q.source_type === "code" ? "💻" : "🔗"}</span>
                  </div>
                  {courseTitle && (
                    <p className="text-xs text-primary line-clamp-1">🎓 {courseTitle}</p>
                  )}
                  <div className="flex gap-1.5 pt-2">
                    <a
                      href={`/quizzes/${q.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-xs px-2 py-1.5 rounded-md bg-primary/10 text-primary text-center hover:bg-primary/20"
                    >
                      معاينة
                    </a>
                    <button onClick={() => startEdit(q)} className="flex-1 text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80">
                      تعديل
                    </button>
                    <button onClick={() => togglePublish(q)} className="flex-1 text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80">
                      {q.is_published ? "إخفاء" : "نشر"}
                    </button>
                    <button onClick={() => remove(q)} className="text-xs px-2 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20">
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
