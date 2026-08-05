import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import type { TeacherProfileRow } from "@/lib/teachers";

export const Route = createFileRoute("/admin/instructors")({
  head: () => ({ meta: [{ title: "المدرسون — معلوم" }] }),
  component: AdminInstructors,
});

interface TeacherAdminRow extends TeacherProfileRow {
  email: string;
  phone: string;
  created_at: string;
  review_notes: string | null;
  decision_reason: string | null;
}

interface TeacherFormState {
  full_name: string;
  specialization: string;
  teaching_subject: string;
  years_experience: string;
  city: string;
  country: string;
  profile_image_url: string;
  bio_short: string;
  bio_full: string;
  badge: string;
  students_count: string;
  courses_count: string;
  rating_avg: string;
  rating_count: string;
  display_order: string;
  is_home_visible: boolean;
  email: string;
  phone: string;
}

const emptyForm = (): TeacherFormState => ({
  full_name: "",
  specialization: "",
  teaching_subject: "",
  years_experience: "0",
  city: "الرياض",
  country: "السعودية",
  profile_image_url: "",
  bio_short: "",
  bio_full: "",
  badge: "",
  students_count: "0",
  courses_count: "0",
  rating_avg: "0",
  rating_count: "0",
  display_order: "1000",
  is_home_visible: true,
  email: "",
  phone: "",
});

function AdminInstructors() {
  const [teachers, setTeachers] = useState<TeacherAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<TeacherFormState>(emptyForm());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teacher_applications")
      .select("id,full_name,specialization,teaching_subject,years_experience,bio_short,profile_image_url,badge,students_count,courses_count,rating_avg,rating_count,is_home_visible,display_order,status,city,country,availability,teaching_type,linkedin_url,youtube_url,intro_video_url,bio_full,email,phone,review_notes,decision_reason,created_at,terms_accepted,resume_url,certificates_urls")
      .eq("status", "accepted")
      .order("is_home_visible", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("تعذّر تحميل المدرسين", { description: error.message });
      setTeachers([]);
    } else {
      const mapped = (data as TeacherAdminRow[] | null) || [];
      setTeachers(mapped);
      setSelectedId((current) => {
        if (current && mapped.some((row) => row.id === current)) return current;
        return mapped[0]?.id || null;
      });
      if (mapped[0]) {
        setForm((prev) => ({ ...prev, display_order: String(mapped[0].display_order || 1000) }));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const applySelection = (id: string | null) => {
    if (!id) {
      setSelectedId(null);
      setIsEditing(false);
      setForm(emptyForm());
      return;
    }

    const teacher = teachers.find((item) => item.id === id);
    if (!teacher) return;

    setSelectedId(id);
    setIsEditing(true);
    setForm({
      full_name: teacher.full_name || "",
      specialization: teacher.specialization || "",
      teaching_subject: teacher.teaching_subject || "",
      years_experience: String(teacher.years_experience || 0),
      city: teacher.city || "الرياض",
      country: teacher.country || "السعودية",
      profile_image_url: teacher.profile_image_url || "",
      bio_short: teacher.bio_short || "",
      bio_full: teacher.bio_full || "",
      badge: teacher.badge || "",
      students_count: String(teacher.students_count || 0),
      courses_count: String(teacher.courses_count || 0),
      rating_avg: String(teacher.rating_avg || 0),
      rating_count: String(teacher.rating_count || 0),
      display_order: String(teacher.display_order || 1000),
      is_home_visible: teacher.is_home_visible,
      email: teacher.email || "",
      phone: teacher.phone || "",
    });
  };

  useEffect(() => {
    if (!selectedId && teachers.length > 0) {
      applySelection(teachers[0].id);
    }
  }, [selectedId, teachers]);

  const resetForm = () => {
    setSelectedId(null);
    setIsEditing(false);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.specialization.trim() || !form.teaching_subject.trim()) {
      toast.error("أدخل اسم المعلم والتخصص والمادة قبل الحفظ");
      return;
    }

    setSaving(true);

    const payload = {
      full_name: form.full_name || null,
      specialization: form.specialization || null,
      teaching_subject: form.teaching_subject || null,
      years_experience: Number(form.years_experience) || 0,
      city: form.city || "الرياض",
      country: form.country || "السعودية",
      profile_image_url: form.profile_image_url || null,
      bio_short: form.bio_short || null,
      bio_full: form.bio_full || null,
      badge: form.badge || null,
      students_count: Number(form.students_count) || 0,
      courses_count: Number(form.courses_count) || 0,
      rating_avg: Number(form.rating_avg) || 0,
      rating_count: Number(form.rating_count) || 0,
      display_order: Number(form.display_order) || 1000,
      is_home_visible: form.is_home_visible,
      email: form.email || null,
      phone: form.phone || null,
      status: "accepted",
      terms_accepted: true,
      education_level: "بكالوريوس",
      university: "غير محدد",
      teaching_type: "both",
      availability: "متاحة",
      certificates_urls: [],
    };

    const request = isEditing && selectedId
      ? supabase.from("teacher_applications").update(payload).eq("id", selectedId).select().single()
      : supabase.from("teacher_applications").insert(payload).select().single();

    const { data, error } = await request;

    if (error) {
      toast.error("تعذّر حفظ المعلم", { description: error.message });
      setSaving(false);
      return;
    }

    toast.success(isEditing ? "تم تحديث المعلم بنجاح" : "تمت إضافة المعلم إلى قسم النخبة");
    setSelectedId(data?.id || null);
    setIsEditing(Boolean(data?.id));
    await load();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("هل تريد حذف هذا المعلم من قسم النخبة؟")) return;

    setSaving(true);
    const { error } = await supabase.from("teacher_applications").delete().eq("id", selectedId);

    if (error) {
      toast.error("تعذّر حذف المعلم", { description: error.message });
      setSaving(false);
      return;
    }

    toast.success("تم حذف المعلم من القسم");
    resetForm();
    await load();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">المدرسون</h1>
            <p className="text-sm text-muted-foreground mt-1">إدارة المعلمين المقبولين في قسم المعلمون النخبة، سواء كانوا ظاهرين حالياً على الصفحة الرئيسية أو مخفيين، مع إمكانية الإضافة والتعديل والحذف.</p>
          </div>
          <Button variant="hero" onClick={resetForm} disabled={saving}>إضافة معلم جديد</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">قائمة المعلمين النخبة</h2>
              <p className="text-xs text-muted-foreground">اختر معلمًا لتعديل بياناته أو تغيير ظهوره على الصفحة الرئيسية</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{teachers.length} معلم</span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground">جاري التحميل...</div>
          ) : teachers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد معلمين بعد. أضف أول معلم لظهر في الصفحة الرئيسية.
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => applySelection(teacher.id)}
                  className={`w-full rounded-xl border p-3 text-right transition ${selectedId === teacher.id ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{teacher.full_name}</p>
                      <p className="text-xs text-muted-foreground">{teacher.specialization || "غير محدد"} • {teacher.teaching_subject || "غير محدد"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${teacher.is_home_visible ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {teacher.is_home_visible ? "ظاهر" : "مخفي"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{isEditing ? "تعديل المعلم" : "إضافة معلم جديد"}</h2>
              <p className="text-xs text-muted-foreground">تظهر هذه البيانات في بطاقة المعلم على الصفحة الرئيسية</p>
            </div>
            {isEditing && (
              <Button variant="ghost" size="sm" onClick={handleDelete} disabled={saving} className="text-destructive">
                حذف
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="اسم المعلم">
              <Input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} />
            </Field>
            <Field label="البريد الإلكتروني">
              <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} dir="ltr" placeholder="name@example.com" />
            </Field>
            <Field label="التخصص">
              <Input value={form.specialization} onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))} />
            </Field>
            <Field label="المادة أو الموضوع">
              <Input value={form.teaching_subject} onChange={(e) => setForm((prev) => ({ ...prev, teaching_subject: e.target.value }))} />
            </Field>
            <Field label="الهاتف">
              <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} dir="ltr" />
            </Field>
            <NumberField label="سنوات الخبرة" value={form.years_experience} onChange={(value) => setForm((prev) => ({ ...prev, years_experience: value }))} />
            <Field label="المدينة">
              <Input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} />
            </Field>
            <Field label="الدولة">
              <Input value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
            </Field>
            <Field label="صورة المعلم">
              <ImageUpload
                value={form.profile_image_url}
                onChange={(url) => setForm((prev) => ({ ...prev, profile_image_url: url }))}
                folder={`teacher-profiles/${selectedId || "new"}`}
              />
            </Field>
            <Field label="الشارة">
              <select
                value={form.badge}
                onChange={(e) => setForm((prev) => ({ ...prev, badge: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">بدون شارة</option>
                <option value="معلم متميز">معلم متميز</option>
                <option value="الأكثر طلباً">الأكثر طلباً</option>
                <option value="خبير معتمد">خبير معتمد</option>
              </select>
            </Field>
            <NumberField label="ترتيب الظهور" value={form.display_order} onChange={(value) => setForm((prev) => ({ ...prev, display_order: value }))} />
            <NumberField label="عدد الطلاب" value={form.students_count} onChange={(value) => setForm((prev) => ({ ...prev, students_count: value }))} />
            <NumberField label="عدد الدورات" value={form.courses_count} onChange={(value) => setForm((prev) => ({ ...prev, courses_count: value }))} />
            <NumberField label="متوسط التقييم" value={form.rating_avg} onChange={(value) => setForm((prev) => ({ ...prev, rating_avg: value }))} />
            <NumberField label="عدد التقييمات" value={form.rating_count} onChange={(value) => setForm((prev) => ({ ...prev, rating_count: value }))} />
          </div>

          <div className="mt-4 flex items-start gap-2">
            <Checkbox
              id="home-visible"
              checked={form.is_home_visible}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_home_visible: Boolean(checked) }))}
            />
            <Label htmlFor="home-visible">إظهار المعلم في قسم المعلمون النخبة على الصفحة الرئيسية</Label>
          </div>

          <div className="mt-4 space-y-2">
            <Label>نبذة مختصرة</Label>
            <Textarea value={form.bio_short} onChange={(e) => setForm((prev) => ({ ...prev, bio_short: e.target.value }))} rows={2} />
          </div>

          <div className="mt-4 space-y-2">
            <Label>نبذة كاملة</Label>
            <Textarea value={form.bio_full} onChange={(e) => setForm((prev) => ({ ...prev, bio_full: e.target.value }))} rows={3} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="hero" onClick={handleSave} disabled={saving}>
              {isEditing ? "حفظ التعديلات" : "إضافة المعلم"}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={saving}>إلغاء</Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" inputMode="numeric" />
    </Field>
  );
}
