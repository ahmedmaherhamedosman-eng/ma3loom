import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/admin/posts")({
  head: () => ({ meta: [{ title: "إدارة المدونة — معلوم" }] }),
  component: AdminPosts,
});

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    image_url: "",
    status: "draft" as "draft" | "published",
  });

  const loadPosts = async () => {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const resetForm = () => {
    setForm({ title: "", content: "", excerpt: "", image_url: "", status: "draft" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };

    if (editingId) {
      await supabase.from("posts").update(payload).eq("id", editingId);
    } else {
      await supabase.from("posts").insert(payload);
    }
    resetForm();
    loadPosts();
  };

  const handleEdit = (p: Post) => {
    setForm({
      title: p.title,
      content: p.content || "",
      excerpt: p.excerpt || "",
      image_url: p.image_url || "",
      status: p.status as "draft" | "published",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا المنشور؟")) return;
    await supabase.from("posts").delete().eq("id", id);
    loadPosts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة المدونة</h1>
        <Button variant="hero" onClick={() => { resetForm(); setShowForm(true); }}>+ مقال جديد</Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">{editingId ? "تعديل المقال" : "مقال جديد"}</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>العنوان *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الملخص</Label>
              <Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="ملخص قصير يظهر في القائمة" />
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[200px]"
                placeholder="اكتب محتوى المنشور هنا..."
              />
            </div>
            <div className="space-y-2">
              <Label>صورة المنشور</Label>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                folder="posts"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.status === "published"}
                  onChange={(e) => setForm({ ...form, status: e.target.checked ? "published" : "draft" })}
                />
                <span className="text-sm">نشر الآن</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="hero" onClick={handleSave}>{editingId ? "حفظ" : "إضافة"}</Button>
            <Button variant="outline" onClick={resetForm}>إلغاء</Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-right p-3 font-medium text-muted-foreground">العنوان</th>
              <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">التاريخ</th>
              <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
              <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد منشورات</td></tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3 font-medium text-foreground">{p.title}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.status === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {p.status === "published" ? "منشور" : "مسودة"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>✏️</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive">🗑️</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
