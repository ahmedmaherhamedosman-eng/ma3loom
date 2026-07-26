import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { formatPrice, type Currency } from "@/lib/currency";

export const Route = createFileRoute("/admin/books")({
  head: () => ({ meta: [{ title: "إدارة الكتب — لوحة التحكم" }] }),
  component: AdminBooks,
});

type Book = Tables<"books">;

const CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "math", label: "رياضيات" },
  { value: "science", label: "علوم" },
  { value: "language", label: "لغات" },
  { value: "literature", label: "أدب" },
  { value: "history", label: "تاريخ" },
  { value: "religion", label: "ديني" },
  { value: "programming", label: "برمجة" },
  { value: "business", label: "أعمال" },
  { value: "children", label: "أطفال" },
];

const LEVELS = ["عام", "ابتدائي", "متوسط", "ثانوي", "جامعي"];
const CURRENCIES: Currency[] = ["SAR", "USD", "EUR", "AED", "EGP"];

type Form = {
  title: string;
  author: string;
  description: string;
  cover_url: string;
  pdf_url: string;
  pdf_path: string;
  category: string;
  education_level: string;
  language: string;
  pages_count: number;
  file_size_mb: number;
  price: number;
  currency: Currency;
  is_free: boolean;
  is_published: boolean;
  sort_order: number;
};

const emptyForm: Form = {
  title: "",
  author: "",
  description: "",
  cover_url: "",
  pdf_url: "",
  pdf_path: "",
  category: "general",
  education_level: "عام",
  language: "ar",
  pages_count: 0,
  file_size_mb: 0,
  price: 0,
  currency: "SAR",
  is_free: true,
  is_published: false,
  sort_order: 0,
};

function AdminBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "free" | "paid">("all");

  const [form, setForm] = useState<Form>(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setBooks(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (b: Book) => {
    setForm({
      title: b.title,
      author: b.author || "",
      description: b.description || "",
      cover_url: b.cover_url || "",
      pdf_url: b.pdf_url || "",
      pdf_path: b.pdf_path || "",
      category: b.category,
      education_level: b.education_level,
      language: b.language,
      pages_count: b.pages_count,
      file_size_mb: Number(b.file_size_mb) || 0,
      price: Number(b.price) || 0,
      currency: (b.currency as Currency) || "SAR",
      is_free: b.is_free,
      is_published: b.is_published,
      sort_order: b.sort_order,
    });
    setEditingId(b.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("يجب أن يكون الملف بصيغة PDF");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("الحد الأقصى 100 ميجابايت");
      return;
    }
    setUploadingPdf(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("books").upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });
    setUploadingPdf(false);
    if (error) { toast.error("فشل رفع الملف: " + error.message); return; }
    setForm((f) => ({
      ...f,
      pdf_path: path,
      pdf_url: "",
      file_size_mb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
    }));
    toast.success("تم رفع ملف الكتاب");
  };

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يجب أن تكون صورة");
      return;
    }
    setUploadingCover(true);
    const path = `books/covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
    if (error) { setUploadingCover(false); toast.error(error.message); return; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    setUploadingCover(false);
    setForm((f) => ({ ...f, cover_url: data.publicUrl }));
    toast.success("تم رفع الغلاف");
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("أدخل عنوان الكتاب"); return; }
    if (!form.author.trim()) { toast.error("أدخل اسم المؤلف"); return; }
    if (!form.pdf_path && !form.pdf_url.trim()) {
      toast.error("ارفع ملف PDF أو ضع رابطًا");
      return;
    }
    if (!form.is_free && form.price <= 0) {
      toast.error("أدخل سعرًا صحيحًا أو اجعل الكتاب مجانيًا");
      return;
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      description: form.description.trim() || null,
      cover_url: form.cover_url.trim() || null,
      pdf_url: form.pdf_path ? null : (form.pdf_url.trim() || null),
      pdf_path: form.pdf_path || null,
      category: form.category,
      education_level: form.education_level,
      language: form.language,
      pages_count: Math.max(0, Math.floor(form.pages_count)),
      file_size_mb: Math.max(0, form.file_size_mb),
      price: form.is_free ? 0 : form.price,
      currency: form.currency,
      is_free: form.is_free,
      is_published: form.is_published,
      sort_order: Math.floor(form.sort_order),
    };

    const { error } = editingId
      ? await supabase.from("books").update(payload).eq("id", editingId)
      : await supabase.from("books").insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "تم تحديث الكتاب" : "تم إضافة الكتاب");
    resetForm();
    load();
  };

  const togglePublish = async (b: Book) => {
    const { error } = await supabase.from("books")
      .update({ is_published: !b.is_published }).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const remove = async (b: Book) => {
    if (!confirm(`حذف كتاب "${b.title}" نهائيًا؟`)) return;
    if (b.pdf_path) {
      await supabase.storage.from("books").remove([b.pdf_path]);
    }
    const { error } = await supabase.from("books").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (filter === "published" && !b.is_published) return false;
      if (filter === "draft" && b.is_published) return false;
      if (filter === "free" && !b.is_free) return false;
      if (filter === "paid" && b.is_free) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author || "").toLowerCase().includes(q) ||
        (b.description || "").toLowerCase().includes(q)
      );
    });
  }, [books, search, filter]);

  const stats = useMemo(() => ({
    total: books.length,
    published: books.filter((b) => b.is_published).length,
    free: books.filter((b) => b.is_free).length,
    paid: books.filter((b) => !b.is_free).length,
    downloads: books.reduce((s, b) => s + (b.downloads_count || 0), 0),
  }), [books]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📚 إدارة الكتب</h1>
          <p className="text-sm text-muted-foreground">ارفع كتب PDF مجانية أو مدفوعة وتحكّم بنشرها</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            + إضافة كتاب جديد
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: "الكل", value: stats.total, icon: "📚" },
          { label: "منشور", value: stats.published, icon: "✅" },
          { label: "مجاني", value: stats.free, icon: "🆓" },
          { label: "مدفوع", value: stats.paid, icon: "💰" },
          { label: "تحميلات", value: stats.downloads, icon: "⬇️" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs text-muted-foreground">{s.icon} {s.label}</div>
            <div className="text-xl font-bold text-foreground mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-foreground">{editingId ? "✏️ تعديل الكتاب" : "➕ كتاب جديد"}</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">العنوان *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder="عنوان الكتاب"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المؤلف *</label>
              <input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                placeholder="اسم المؤلف"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              placeholder="نبذة عن الكتاب"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-sm font-medium mb-1">المستوى</label>
              <select
                value={form.education_level}
                onChange={(e) => setForm({ ...form, education_level: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">اللغة</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                <option value="ar">العربية</option>
                <option value="en">الإنجليزية</option>
                <option value="fr">الفرنسية</option>
              </select>
            </div>
          </div>

          {/* PDF upload */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium">📄 ملف الكتاب (PDF) *</div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={uploadPdf}
              disabled={uploadingPdf}
              className="w-full text-sm file:me-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary"
            />
            {uploadingPdf && <p className="text-xs text-muted-foreground">جارٍ الرفع...</p>}
            {form.pdf_path && (
              <div className="text-xs text-green-600 flex items-center justify-between gap-2 bg-green-50 rounded-md p-2">
                <span>✓ مرفوع: {form.pdf_path}</span>
                <button
                  onClick={() => setForm({ ...form, pdf_path: "", file_size_mb: 0 })}
                  className="text-destructive text-xs hover:underline"
                >
                  إزالة
                </button>
              </div>
            )}
            <div className="text-xs text-muted-foreground">أو استخدم رابط PDF خارجي:</div>
            <input
              value={form.pdf_url}
              onChange={(e) => setForm({ ...form, pdf_url: e.target.value })}
              disabled={!!form.pdf_path}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm disabled:opacity-50"
              placeholder="https://example.com/book.pdf"
              dir="ltr"
            />
          </div>

          {/* Cover */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium">🖼️ صورة الغلاف (اختياري)</div>
            <div className="flex items-start gap-3">
              {form.cover_url && (
                <img src={form.cover_url} alt="غلاف" className="w-20 h-28 object-cover rounded-md border border-border" />
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadCover}
                  disabled={uploadingCover}
                  className="w-full text-sm file:me-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary"
                />
                <input
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="أو ألصق رابط صورة"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">عدد الصفحات</label>
              <input
                type="number"
                min={0}
                value={form.pages_count}
                onChange={(e) => setForm({ ...form, pages_count: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الحجم (MB)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.file_size_mb}
                onChange={(e) => setForm({ ...form, file_size_mb: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ترتيب العرض</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_free}
                onChange={(e) => setForm({ ...form, is_free: e.target.checked, price: e.target.checked ? 0 : form.price })}
                className="w-4 h-4"
              />
              🆓 كتاب مجاني
            </label>
            {!form.is_free && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">السعر</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">العملة</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="w-4 h-4"
            />
            نشر الكتاب مباشرة (مرئي للطلاب)
          </label>

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              disabled={uploadingPdf || uploadingCover}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {editingId ? "💾 حفظ التعديلات" : "➕ إضافة الكتاب"}
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث بالعنوان أو المؤلف..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-input bg-background text-sm"
        />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {([
            ["all", "الكل"],
            ["published", "منشور"],
            ["draft", "مسودة"],
            ["free", "مجاني"],
            ["paid", "مدفوع"],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center bg-card border border-border rounded-2xl p-12">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-muted-foreground">
            {books.length === 0 ? "لا توجد كتب بعد. أضف كتابك الأول!" : "لا توجد نتائج مطابقة"}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <div key={b.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex gap-3 p-4">
                {b.cover_url ? (
                  <img src={b.cover_url} alt={b.title} className="w-20 h-28 object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-20 h-28 rounded-md bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-3xl flex-shrink-0">
                    📖
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-foreground line-clamp-2 text-sm">{b.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${b.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {b.is_published ? "منشور" : "مسودة"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">✍️ {b.author}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded ${b.is_free ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {b.is_free ? "مجاني" : formatPrice(Number(b.price), b.currency as Currency)}
                    </span>
                    {b.pages_count > 0 && <span className="text-muted-foreground">{b.pages_count} صفحة</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>⬇️ {b.downloads_count}</span>
                    <span>•</span>
                    <span>👁️ {b.views_count}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 p-3 pt-0">
                <button onClick={() => startEdit(b)} className="flex-1 text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80">
                  تعديل
                </button>
                <button onClick={() => togglePublish(b)} className="flex-1 text-xs px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80">
                  {b.is_published ? "إخفاء" : "نشر"}
                </button>
                <button onClick={() => remove(b)} className="text-xs px-2 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
