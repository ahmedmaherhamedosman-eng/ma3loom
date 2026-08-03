import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/teachers")({
  head: () => ({ meta: [{ title: "إدارة المعلمين — لوحة التحكم" }] }),
  component: AdminTeachersPage,
});

interface TeacherRow {
  id: string;
  full_name: string;
  specialization: string;
  teaching_subject: string;
  bio_short: string | null;
  profile_image_url: string | null;
  is_home_visible: boolean;
  display_order: number;
  status: string;
}

interface TeacherFormState {
  full_name: string;
  specialization: string;
  teaching_subject: string;
  bio_short: string;
  profile_image_url: string;
  is_home_visible: boolean;
  display_order: string;
}

const emptyForm = (): TeacherFormState => ({
  full_name: "",
  specialization: "الرياضيات",
  teaching_subject: "المرحلة الثانوية",
  bio_short: "",
  profile_image_url: "",
  is_home_visible: true,
  display_order: "1000",
});

function AdminTeachersPage() {
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherFormState>(emptyForm());

  const loadTeachers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teacher_applications")
      .select("id,full_name,specialization,teaching_subject,bio_short,profile_image_url,is_home_visible,display_order,status")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("تعذّر تحميل المعلمين", { description: error.message });
      setRows([]);
    } else {
      setRows((data as TeacherRow[] | null) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadTeachers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.full_name.trim() || !form.specialization.trim() || !form.teaching_subject.trim()) {
      toast.error("أدخل اسم المعلم والتخصص والمادة التعليمية");
      return;
    }

    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      specialization: form.specialization.trim(),
      teaching_subject: form.teaching_subject.trim(),
      bio_short: form.bio_short.trim() || null,
      profile_image_url: form.profile_image_url || null,
      is_home_visible: form.is_home_visible,
      display_order: Number(form.display_order) || 1000,
      status: "accepted",
      city: "غير محدد",
      country: "غير محدد",
      education_level: "غير محدد",
      email: `${form.full_name.trim().replace(/\s+/g, "").toLowerCase()}@mloom.local`,
      phone: "0000000000",
      university: "غير محدد",
      terms_accepted: true,
    };

    const { error } = editingId
      ? await supabase.from("teacher_applications").update(payload).eq("id", editingId)
      : await supabase.from("teacher_applications").insert(payload);

    if (error) {
      toast.error(editingId ? "تعذّر تعديل المعلم" : "تعذّر إضافة المعلم", { description: error.message });
    } else {
      toast.success(editingId ? "تم تحديث المعلم" : "تمت إضافة المعلم");
      resetForm();
      await loadTeachers();
    }

    setSaving(false);
  };

  const handleEdit = (teacher: TeacherRow) => {
    setEditingId(teacher.id);
    setForm({
      full_name: teacher.full_name,
      specialization: teacher.specialization,
      teaching_subject: teacher.teaching_subject,
      bio_short: teacher.bio_short || "",
      profile_image_url: teacher.profile_image_url || "",
      is_home_visible: teacher.is_home_visible,
      display_order: String(teacher.display_order || 1000),
    });
  };

  const handleDelete = async (teacherId: string) => {
    if (!confirm("هل تريد حذف هذا المعلم من الصفحة الرئيسية والقاعدة؟")) return;

    const { error } = await supabase.from("teacher_applications").delete().eq("id", teacherId);
    if (error) {
      toast.error("تعذّر الحذف", { description: error.message });
      return;
    }

    toast.success("تم حذف المعلم");
    if (editingId === teacherId) resetForm();
    await loadTeachers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة المعلمين</h1>
        <p className="text-sm text-muted-foreground mt-1">أضف أو عدّل أو احذف معلمي الصفحة الرئيسية مباشرة من هنا.</p>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{editingId ? "تعديل بيانات معلم" : "إضافة معلم جديد"}</h2>
              <p className="text-sm text-muted-foreground">ادخل الاسم والنبذة والصورة ثم حدّد ما إذا كان يظهر في الصفحة الرئيسية.</p>
            </div>
            {editingId && (
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                إلغاء
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">اسم المعلم</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="مثال: أحمد محمد" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">التخصص</Label>
                <Input id="specialization" value={form.specialization} onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))} placeholder="مثال: علوم" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teaching_subject">المادة / المرحلة</Label>
                <Input id="teaching_subject" value={form.teaching_subject} onChange={(e) => setForm((prev) => ({ ...prev, teaching_subject: e.target.value }))} placeholder="مثال: رياضيات المرحلة الثانوية" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">ترتيب الظهور</Label>
                <Input id="display_order" type="number" value={form.display_order} onChange={(e) => setForm((prev) => ({ ...prev, display_order: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio_short">نبذة تعريفية</Label>
              <Textarea id="bio_short" rows={3} value={form.bio_short} onChange={(e) => setForm((prev) => ({ ...prev, bio_short: e.target.value }))} placeholder="اكتب نبذة مختصرة عن المعلم من 40 إلى 80 كلمة تقريباً" />
            </div>

            <div className="space-y-2">
              <Label>صورة المعلم</Label>
              <ImageUpload value={form.profile_image_url} onChange={(url) => setForm((prev) => ({ ...prev, profile_image_url: url }))} folder="teachers" />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/40 px-3 py-2">
              <Checkbox id="is_home_visible" checked={form.is_home_visible} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_home_visible: Boolean(checked) }))} />
              <Label htmlFor="is_home_visible" className="cursor-pointer">إظهار هذا المعلم في الصفحة الرئيسية</Label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="hero" disabled={saving}>
                {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة المعلم"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                مسح النموذج
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">المعلمين الحاليون</h2>
              <p className="text-sm text-muted-foreground">يمكنك تعديل ترتيب الظهور أو إخفاء المعلم دون تغيير الكود.</p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{rows.length} معلم</div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">جاري تحميل المعلمين...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
              لا توجد معلمين حتى الآن. أضف أول معلم من النموذج الجانبي.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((teacher) => (
                <div key={teacher.id} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{teacher.full_name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.specialization} • {teacher.teaching_subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {teacher.is_home_visible ? (
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">ظاهر</span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">مخفي</span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-7">{teacher.bio_short || "لا توجد نبذة حتى الآن."}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(teacher)}>
                      <Pencil className="ms-1 h-4 w-4" /> تعديل
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(teacher.id)} className="text-destructive">
                      <Trash2 className="ms-1 h-4 w-4" /> حذف
                    </Button>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">الترتيب: {teacher.display_order}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
