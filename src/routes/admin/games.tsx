import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/games")({
  component: AdminGames,
});

type Game = Tables<"educational_games">;
type Course = Pick<Tables<"courses">, "id" | "title">;

const CATEGORIES = [
  { value: "math", label: "رياضيات" },
  { value: "science", label: "علوم" },
  { value: "language", label: "لغات" },
  { value: "programming", label: "برمجة" },
  { value: "general", label: "عام" },
];

function AdminGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general",
    image_url: "",
    game_type: "url" as "url" | "file",
    game_url: "",
    html_file_path: "",
    course_id: "" as string,
    is_published: true,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from("educational_games").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title").order("title"),
    ]);
    setGames(g || []);
    setCourses(c || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({
      title: "", description: "", category: "general", image_url: "",
      game_type: "url", game_url: "", html_file_path: "", course_id: "", is_published: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (g: Game) => {
    setForm({
      title: g.title,
      description: g.description || "",
      category: g.category,
      image_url: g.image_url || "",
      game_type: g.game_type as "url" | "file",
      game_url: g.game_url || "",
      html_file_path: g.html_file_path || "",
      course_id: g.course_id || "",
      is_published: g.is_published,
    });
    setEditingId(g.id);
    setShowForm(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      toast.error("يجب أن يكون الملف بصيغة .html");
      return;
    }
    setUploading(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("educational-games").upload(path, file, {
      contentType: "text/html",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error("فشل رفع الملف: " + error.message);
      return;
    }
    setForm({ ...form, html_file_path: path });
    toast.success("تم رفع ملف اللعبة");
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("أدخل عنوان اللعبة"); return; }
    if (form.game_type === "url" && !form.game_url.trim()) { toast.error("أدخل رابط اللعبة"); return; }
    if (form.game_type === "file" && !form.html_file_path) { toast.error("ارفع ملف HTML"); return; }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      image_url: form.image_url.trim() || null,
      game_type: form.game_type,
      game_url: form.game_type === "url" ? form.game_url.trim() : null,
      html_file_path: form.game_type === "file" ? form.html_file_path : null,
      course_id: form.course_id || null,
      is_published: form.is_published,
    };

    const { error } = editingId
      ? await supabase.from("educational_games").update(payload).eq("id", editingId)
      : await supabase.from("educational_games").insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "تم تحديث اللعبة" : "تم إضافة اللعبة");
    resetForm();
    load();
  };

  const togglePublish = async (g: Game) => {
    const { error } = await supabase.from("educational_games")
      .update({ is_published: !g.is_published }).eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async (g: Game) => {
    if (!confirm(`حذف لعبة "${g.title}"؟`)) return;
    if (g.html_file_path) {
      await supabase.storage.from("educational-games").remove([g.html_file_path]);
    }
    const { error } = await supabase.from("educational_games").delete().eq("id", g.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🎮 الألعاب التعليمية</h1>
          <p className="text-sm text-muted-foreground">أضف ألعاب HTML تفاعلية للطلاب</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            + إضافة لعبة جديدة
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-foreground">{editingId ? "تعديل اللعبة" : "لعبة جديدة"}</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">العنوان *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder="مثال: لعبة الجمع السريع"
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
              placeholder="وصف قصير للعبة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">رابط صورة الغلاف (اختياري)</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">نوع اللعبة *</label>
            <div className="flex gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  checked={form.game_type === "url"}
                  onChange={() => setForm({ ...form, game_type: "url" })}
                  className="sr-only peer"
                />
                <div className="p-3 rounded-lg border-2 border-input peer-checked:border-primary peer-checked:bg-primary/5 text-center text-sm">
                  🔗 رابط خارجي
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  checked={form.game_type === "file"}
                  onChange={() => setForm({ ...form, game_type: "file" })}
                  className="sr-only peer"
                />
                <div className="p-3 rounded-lg border-2 border-input peer-checked:border-primary peer-checked:bg-primary/5 text-center text-sm">
                  📁 ملف HTML
                </div>
              </label>
            </div>
          </div>

          {form.game_type === "url" ? (
            <div>
              <label className="block text-sm font-medium mb-1">رابط اللعبة *</label>
              <input
                value={form.game_url}
                onChange={(e) => setForm({ ...form, game_url: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder="https://scratch.mit.edu/projects/..."
                dir="ltr"
              />
            </div>
          ) : (
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
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">مرتبطة بكورس (اختياري)</label>
            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
            >
              <option value="">— متاحة لكل الطلاب المسجّلين —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              إذا اخترت كورس، فقط الطلاب المسجّلون فيه سيرون اللعبة
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="w-4 h-4"
            />
            منشورة (مرئية للطلاب)
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              {editingId ? "حفظ التعديلات" : "إضافة اللعبة"}
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

      {/* Games list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">جارٍ التحميل...</div>
      ) : games.length === 0 ? (
        <div className="text-center bg-card border border-border rounded-2xl p-12">
          <div className="text-5xl mb-3">🎮</div>
          <p className="text-muted-foreground">لا توجد ألعاب بعد. أضف لعبتك الأولى!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => (
            <div key={g.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {g.image_url && (
                <img src={g.image_url} alt={g.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground line-clamp-1">{g.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${g.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {g.is_published ? "منشورة" : "مخفية"}
                  </span>
                </div>
                {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{g.game_type === "url" ? "🔗 رابط" : "📁 ملف"}</span>
                  <span>•</span>
                  <span>{CATEGORIES.find((c) => c.value === g.category)?.label || g.category}</span>
                </div>
                <div className="flex gap-1.5 pt-2">
                  <button onClick={() => startEdit(g)} className="flex-1 text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80">تعديل</button>
                  <button onClick={() => togglePublish(g)} className="flex-1 text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80">
                    {g.is_published ? "إخفاء" : "نشر"}
                  </button>
                  <button onClick={() => remove(g)} className="text-xs px-2 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20">حذف</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
