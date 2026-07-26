import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "إدارة التصنيفات — معلوم" }] }),
  component: AdminCategories,
});

type Category = Tables<"categories">;

const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]/g, "");

function AdminCategories() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", icon: "", sort_order: 0 });

  const load = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm({ name: "", slug: "", icon: "", sort_order: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("اسم التصنيف مطلوب");
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      icon: form.icon.trim() || null,
      sort_order: form.sort_order,
    };

    if (editingId) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editingId);
      if (error) return toast.error("فشل الحفظ", { description: error.message });
      toast.success("تم تحديث التصنيف");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) return toast.error("فشل الإضافة", { description: error.message });
      toast.success("تم إضافة التصنيف");
    }
    reset();
    load();
  };

  const handleEdit = (c: Category) => {
    setForm({ name: c.name, slug: c.slug, icon: c.icon || "", sort_order: c.sort_order });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا التصنيف؟ سيتم فك ربطه من كل الكورسات.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error("فشل الحذف", { description: error.message });
    toast.success("تم الحذف");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة التصنيفات</h1>
        <Button variant="hero" onClick={() => { reset(); setShowForm(true); }}>
          + إضافة تصنيف
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">{editingId ? "تعديل التصنيف" : "تصنيف جديد"}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })}
                placeholder="مثال: برمجة"
              />
            </div>
            <div className="space-y-2">
              <Label>المعرّف (slug)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                placeholder="programming"
              />
            </div>
            <div className="space-y-2">
              <Label>الأيقونة (إيموجي)</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="💻"
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="hero" onClick={handleSave}>
              {editingId ? "حفظ التعديلات" : "إضافة"}
            </Button>
            <Button variant="outline" onClick={reset}>إلغاء</Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-medium text-muted-foreground">الأيقونة</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الاسم</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">المعرّف</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">الترتيب</th>
                <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد تصنيفات بعد</td></tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 text-2xl">{c.icon || "📁"}</td>
                    <td className="p-3 font-medium text-foreground">{c.name}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground font-mono text-xs">{c.slug}</td>
                    <td className="p-3 hidden md:table-cell">{c.sort_order}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(c)} title="تعديل">✏️</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} title="حذف" className="text-destructive">🗑️</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
