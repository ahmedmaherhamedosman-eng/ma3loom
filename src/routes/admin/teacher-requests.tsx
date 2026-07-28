import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Eye, CheckCircle2, XCircle, MessageSquareWarning, Trash2, Save } from "lucide-react";
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

function AdminTeacherRequestsPage() {
  const [rows, setRows] = useState<TeacherRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [saving, setSaving] = useState(false);
  const [editable, setEditable] = useState<EditableFields>({
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

  useEffect(() => {
    if (!selected) return;
    setDecisionReason(selected.decision_reason || "");
    setReviewNotes(selected.review_notes || "");
    setEditable({
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">طلبات المعلمين</h1>
        <p className="text-sm text-muted-foreground mt-1">مراجعة الطلبات، القبول/الرفض، وإدارة الظهور في الرئيسية</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
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
            {status === "all" ? "الكل" : statusLabel[status] || status}
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
        <section className="rounded-2xl border border-border bg-card p-3">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">جاري تحميل الطلبات...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">لا توجد طلبات في هذا التصنيف.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>التخصص</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الطلب</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} className={selectedId === row.id ? "bg-primary/5" : ""}>
                    <TableCell>
                      <button type="button" onClick={() => setSelectedId(row.id)} className="text-start">
                        <p className="font-semibold text-foreground">{row.full_name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{row.email}</p>
                      </button>
                    </TableCell>
                    <TableCell>{row.specialization}</TableCell>
                    <TableCell>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">
                        {statusLabel[row.status] || row.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          {!selected ? (
            <p className="text-muted-foreground text-sm">اختر طلباً لعرض التفاصيل.</p>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selected.full_name}</h2>
                <p className="text-sm text-muted-foreground">{selected.specialization} • {selected.teaching_subject}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="البريد" value={selected.email} ltr />
                <Info label="الهاتف" value={selected.phone} ltr />
                <Info label="المدينة" value={`${selected.city}، ${selected.country}`} />
                <Info label="الخبرة" value={`${selected.years_experience} سنوات`} />
                <Info label="حالة الطلب" value={statusLabel[selected.status] || selected.status} />
                <Info label="وافق على الشروط" value={selected.terms_accepted ? "نعم" : "لا"} />
              </div>

              {selected.resume_url && (
                <a href={selected.resume_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-block">
                  عرض السيرة الذاتية
                </a>
              )}

              {selected.certificates_urls?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">الشهادات المرفقة</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.certificates_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/80">
                        شهادة
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>ملاحظات الإدارة</Label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} />
              </div>

              <div className="space-y-2">
                <Label>سبب القرار</Label>
                <Input value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} />
              </div>

              <div className="rounded-xl border border-border p-4 space-y-3">
                <h3 className="font-bold text-sm">إعدادات الظهور في الرئيسية</h3>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="is_home_visible"
                    checked={editable.is_home_visible}
                    onCheckedChange={(checked) => setEditable((prev) => ({ ...prev, is_home_visible: Boolean(checked) }))}
                  />
                  <Label htmlFor="is_home_visible">إظهار المعلم في قسم نخبة المعلمين</Label>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
    <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium text-foreground text-sm" dir={ltr ? "ltr" : "rtl"}>{value}</p>
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
