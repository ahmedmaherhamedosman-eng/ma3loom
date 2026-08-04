import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, CheckCircle2, XCircle, MessageSquareWarning, Trash2, Save, Sparkles, FileText, UserRound, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statusLabel, type TeacherProfileRow } from "@/lib/teachers";

export const Route = createFileRoute("/admin/teacher-requests")({
  head: () => ({ meta: [{ title: "طلبات المعلمين — لوحة التحكم" }] }),
  component: AdminTeacherRequestsPage,
});

type ActionKind = "approve" | "reject" | "request_changes";

interface TeacherRequestRow extends TeacherProfileRow {
  email: string;
  phone: string;
  review_notes: string | null;
  decision_reason: string | null;
  created_at: string;
  terms_accepted: boolean;
  resume_url: string | null;
  certificates_urls: string[];
}

interface EditableFields {
  full_name: string;
  specialization: string;
  teaching_subject: string;
  years_experience: string;
  city: string;
  country: string;
  profile_image_url: string;
  bio_full: string;
  is_home_visible: boolean;
  display_order: string;
  badge: string;
  students_count: string;
  courses_count: string;
  rating_avg: string;
  rating_count: string;
  bio_short: string;
}

const STATUS_FILTERS = ["all", "pending", "under_review", "accepted", "needs_changes", "rejected"] as const;
const statusStyles: Record<string, string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  under_review: "border-sky-500/20 bg-sky-500/10 text-sky-700",
  accepted: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-700",
  needs_changes: "border-orange-500/20 bg-orange-500/10 text-orange-700",
};

function AdminTeacherRequestsPage() {
  const [rows, setRows] = useState<TeacherRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState<EditableFields>({
    full_name: "",
    specialization: "",
    teaching_subject: "",
    years_experience: "0",
    city: "",
    country: "",
    profile_image_url: "",
    bio_full: "",
    is_home_visible: false,
    display_order: "1000",
    badge: "",
    students_count: "0",
    courses_count: "0",
    rating_avg: "0",
    rating_count: "0",
    bio_short: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teacher_applications")
      .select("id,full_name,specialization,teaching_subject,years_experience,bio_short,profile_image_url,badge,students_count,courses_count,rating_avg,rating_count,is_home_visible,display_order,status,city,country,availability,teaching_type,linkedin_url,youtube_url,intro_video_url,bio_full,email,phone,review_notes,decision_reason,created_at,terms_accepted,resume_url,certificates_urls")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("تعذّر تحميل الطلبات", { description: error.message });
      setRows([]);
    } else {
      const mapped = (data as TeacherRequestRow[] | null) || [];
      setRows(mapped);
      setSelectedId((current) => {
        if (current && mapped.some((row) => row.id === current)) return current;
        return mapped[0]?.id || null;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) || null, [rows, selectedId]);

  const statusStats = useMemo(() => {
    const counts = STATUS_FILTERS.filter((status) => status !== "all").reduce<Record<string, number>>((acc, status) => {
      acc[status] = rows.filter((row) => row.status === status).length;
      return acc;
    }, {});

    return [
      { label: "إجمالي الطلبات", value: rows.length, tone: "bg-primary/10 text-primary" },
      { label: "قيد الانتظار", value: counts.pending || 0, tone: "bg-amber-500/10 text-amber-700" },
      { label: "تحت المراجعة", value: counts.under_review || 0, tone: "bg-sky-500/10 text-sky-700" },
      { label: "بحاجة لتعديلات", value: counts.needs_changes || 0, tone: "bg-orange-500/10 text-orange-700" },
    ];
  }, [rows]);

  useEffect(() => {
    if (!selected) return;
    setDecisionReason(selected.decision_reason || "");
    setReviewNotes(selected.review_notes || "");
    setEditable({
      full_name: selected.full_name || "",
      specialization: selected.specialization || "",
      teaching_subject: selected.teaching_subject || "",
      years_experience: String(selected.years_experience || 0),
      city: selected.city || "",
      country: selected.country || "",
      profile_image_url: selected.profile_image_url || "",
      bio_full: selected.bio_full || "",
      is_home_visible: selected.is_home_visible,
      display_order: String(selected.display_order || 1000),
      badge: selected.badge || "",
      students_count: String(selected.students_count || 0),
      courses_count: String(selected.courses_count || 0),
      rating_avg: String(selected.rating_avg || 0),
      rating_count: String(selected.rating_count || 0),
      bio_short: selected.bio_short || "",
    });
  }, [selected]);

  const runAction = async (action: ActionKind, targetId?: string) => {
    const requestId = targetId || selected?.id;
    if (!requestId) return;

    setSaving(true);
    const { error } = await supabase.functions.invoke("admin-process-teacher-application", {
      body: {
        applicationId: requestId,
        action,
        decisionReason,
        reviewNotes,
      },
    });

    if (error) {
      toast.error("تعذّرت العملية", { description: error.message });
    } else {
      toast.success("تم تنفيذ العملية بنجاح");
      await load();
    }
    setSaving(false);
  };

  const saveTeacherCardSettings = async () => {
    if (!selected) return;

    setSaving(true);
    const { error } = await supabase
      .from("teacher_applications")
      .update({
        full_name: editable.full_name || null,
        specialization: editable.specialization || null,
        teaching_subject: editable.teaching_subject || null,
        years_experience: Number(editable.years_experience) || 0,
        city: editable.city || null,
        country: editable.country || null,
        profile_image_url: editable.profile_image_url || null,
        bio_full: editable.bio_full || null,
        is_home_visible: editable.is_home_visible,
        display_order: Number(editable.display_order) || 1000,
        badge: editable.badge || null,
        students_count: Number(editable.students_count) || 0,
        courses_count: Number(editable.courses_count) || 0,
        rating_avg: Number(editable.rating_avg) || 0,
        rating_count: Number(editable.rating_count) || 0,
        bio_short: editable.bio_short || null,
        review_notes: reviewNotes || null,
        decision_reason: decisionReason || null,
      })
      .eq("id", selected.id);

    if (error) {
      toast.error("تعذّر حفظ إعدادات الظهور", { description: error.message });
    } else {
      toast.success("تم حفظ إعدادات الملف");
      await load();
    }

    setSaving(false);
  };

  const deleteRequest = async () => {
    if (!selected) return;
    if (!confirm("هل تريد حذف هذا الطلب نهائياً؟")) return;

    setSaving(true);
    const { error } = await supabase.from("teacher_applications").delete().eq("id", selected.id);
    if (error) {
      toast.error("تعذر حذف الطلب", { description: error.message });
    } else {
      toast.success("تم حذف الطلب");
      setSelectedId(null);
      await load();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-card p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/15 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">طلبات المعلمين</h1>
                <p className="text-sm text-muted-foreground">راجع الطلبات بشكل أسرع، وراجع معلومات المعلم والظهور في الرئيسية من مكان واحد.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {statusStats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl border border-border px-3 py-3 ${stat.tone}`}>
                <p className="text-xs font-medium opacity-80">{stat.label}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => {
          const count = status === "all" ? rows.length : rows.filter((row) => row.status === status).length;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {status === "all" ? `الكل (${count})` : `${statusLabel[status] || status} (${count})`}
            </button>
          );
        })}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between px-2">
            <div>
              <p className="font-semibold text-foreground">قائمة الطلبات</p>
              <p className="text-xs text-muted-foreground">اختر طلبًا لعرض التفاصيل وإجراء القرار المناسب.</p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              {filteredRows.length} طلب
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">جاري تحميل الطلبات...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد طلبات في هذا التصنيف.</div>
          ) : (
            <div className="space-y-2">
              {filteredRows.map((row) => {
                const initials = `${row.full_name?.[0] || "م"}${row.full_name?.split(" ")[1]?.[0] || ""}`;
                return (
                  <div key={row.id} className={`rounded-xl border p-3 transition ${selectedId === row.id ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => setSelectedId(row.id)} className="flex-1 text-right">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{row.full_name}</p>
                            <p className="text-xs text-muted-foreground" dir="ltr">{row.email}</p>
                          </div>
                        </div>
                      </button>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[row.status] || "border-border bg-muted text-muted-foreground"}`}>
                        {statusLabel[row.status] || row.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted/70 px-2 py-1">{row.specialization || "غير محدد"}</span>
                      <span className="rounded-full bg-muted/70 px-2 py-1">{row.city || "غير محدد"}</span>
                      <span className="rounded-full bg-muted/70 px-2 py-1">{new Date(row.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(row.id)} title="عرض">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedId(row.id); void runAction("approve", row.id); }} title="قبول" disabled={saving}>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedId(row.id); void runAction("request_changes", row.id); }} title="طلب تعديلات" disabled={saving}>
                        <MessageSquareWarning className="h-4 w-4 text-info" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedId(row.id); void runAction("reject", row.id); }} title="رفض" disabled={saving}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          {!selected ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
              <UserRound className="mb-3 h-8 w-8 text-primary" />
              <p className="font-semibold text-foreground">اختر طلبًا لعرض التفاصيل</p>
              <p className="mt-1">ستظهر هنا معلومات الطلب والملاحظات والإعدادات المرتبطة بالمعلم.</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                        {selected.full_name?.[0] || "م"}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selected.full_name}</h2>
                        <p className="text-sm text-muted-foreground">{selected.specialization || "غير محدد"} • {selected.teaching_subject || "غير محدد"}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[selected.status] || "border-border bg-muted text-muted-foreground"}`}>
                    {statusLabel[selected.status] || selected.status}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="البريد" value={selected.email} ltr />
                <Info label="الهاتف" value={selected.phone} ltr />
                <Info label="المدينة" value={`${selected.city || "غير محدد"}، ${selected.country || "غير محدد"}`} />
                <Info label="الخبرة" value={`${selected.years_experience} سنوات`} />
                <Info label="حالة الطلب" value={statusLabel[selected.status] || selected.status} />
                <Info label="وافق على الشروط" value={selected.terms_accepted ? "نعم" : "لا"} />
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">المستندات والملفات</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected.resume_url ? (
                    <a href={selected.resume_url} target="_blank" rel="noreferrer" className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary hover:bg-primary/15">
                      عرض السيرة الذاتية
                    </a>
                  ) : (
                    <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">لا توجد سيرة ذاتية</span>
                  )}

                  {selected.certificates_urls?.length > 0 ? (
                    selected.certificates_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80">
                        شهادة مرفقة
                      </a>
                    ))
                  ) : (
                    <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">لا توجد شهادات</span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                  <Label>ملاحظات الإدارة</Label>
                  <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} />
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-4">
                  <Label>سبب القرار</Label>
                  <Input value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
                </div>
              </div>

              <div className="rounded-2xl border border-border p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">بيانات المعلم والظهور في الرئيسية</h3>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="اسم المعلم">
                    <Input value={editable.full_name} onChange={(e) => setEditable((p) => ({ ...p, full_name: e.target.value }))} />
                  </Field>
                  <Field label="التخصص">
                    <Input value={editable.specialization} onChange={(e) => setEditable((p) => ({ ...p, specialization: e.target.value }))} />
                  </Field>
                  <Field label="المادة/الموضوع">
                    <Input value={editable.teaching_subject} onChange={(e) => setEditable((p) => ({ ...p, teaching_subject: e.target.value }))} />
                  </Field>
                  <NumberField label="سنوات الخبرة" value={editable.years_experience} onChange={(v) => setEditable((p) => ({ ...p, years_experience: v }))} />
                  <Field label="المدينة">
                    <Input value={editable.city} onChange={(e) => setEditable((p) => ({ ...p, city: e.target.value }))} />
                  </Field>
                  <Field label="الدولة">
                    <Input value={editable.country} onChange={(e) => setEditable((p) => ({ ...p, country: e.target.value }))} />
                  </Field>
                </div>

                <Field label="رابط الصورة الشخصية">
                  <Input value={editable.profile_image_url} onChange={(e) => setEditable((p) => ({ ...p, profile_image_url: e.target.value }))} dir="ltr" placeholder="https://..." />
                </Field>

                <Field label="نبذة كاملة عن المعلم">
                  <Textarea value={editable.bio_full} onChange={(e) => setEditable((p) => ({ ...p, bio_full: e.target.value }))} rows={3} />
                </Field>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="is_home_visible"
                    checked={editable.is_home_visible}
                    onCheckedChange={(checked) => setEditable((prev) => ({ ...prev, is_home_visible: Boolean(checked) }))}
                  />
                  <Label htmlFor="is_home_visible">إظهار المعلم في قسم نخبة المعلمين</Label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <NumberField label="ترتيب الظهور" value={editable.display_order} onChange={(v) => setEditable((p) => ({ ...p, display_order: v }))} />
                  <Field label="شارة">
                    <select
                      value={editable.badge}
                      onChange={(e) => setEditable((p) => ({ ...p, badge: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">بدون شارة</option>
                      <option value="معلم متميز">معلم متميز</option>
                      <option value="الأكثر طلباً">الأكثر طلباً</option>
                      <option value="خبير معتمد">خبير معتمد</option>
                    </select>
                  </Field>
                  <NumberField label="عدد الطلاب" value={editable.students_count} onChange={(v) => setEditable((p) => ({ ...p, students_count: v }))} />
                  <NumberField label="عدد الدورات" value={editable.courses_count} onChange={(v) => setEditable((p) => ({ ...p, courses_count: v }))} />
                  <NumberField label="متوسط التقييم" value={editable.rating_avg} onChange={(v) => setEditable((p) => ({ ...p, rating_avg: v }))} />
                  <NumberField label="عدد التقييمات" value={editable.rating_count} onChange={(v) => setEditable((p) => ({ ...p, rating_count: v }))} />
                </div>

                <div className="space-y-2">
                  <Label>نبذة مختصرة للبطاقة</Label>
                  <Textarea value={editable.bio_short} onChange={(e) => setEditable((p) => ({ ...p, bio_short: e.target.value }))} rows={2} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="hero" size="sm" onClick={saveTeacherCardSettings} disabled={saving}>
                    <Save className="h-4 w-4 ms-1" /> حفظ إعدادات الظهور
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void runAction("approve")} disabled={saving}>
                    قبول + إنشاء حساب مدرس
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void runAction("request_changes")} disabled={saving}>
                    طلب تعديلات
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => void runAction("reject")} disabled={saving} className="text-destructive">
                    رفض
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={deleteRequest} disabled={saving} className="text-destructive">
                    <Trash2 className="h-4 w-4 ms-1" /> حذف
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}

function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground" dir={ltr ? "ltr" : "rtl"}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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
