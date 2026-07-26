import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/lesson-requests")({
  head: () => ({ meta: [{ title: "طلبات الحصص — معلوم" }] }),
  component: AdminLessonRequests,
});

interface Specialty {
  id: string;
  name: string;
  icon: string | null;
  price_per_hour: number;
  is_active: boolean;
  sort_order: number;
  description: string | null;
}

interface Request {
  id: string;
  user_id: string;
  specialty_id: string;
  student_name: string;
  phone: string;
  education_level: string | null;
  preferred_time: string | null;
  sessions_per_week: number | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  tutoring_specialties?: { name: string; icon: string | null } | null;
}

const statusLabel: Record<string, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  completed: "مكتمل",
};

const statusColor: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  reviewing: "bg-warm/10 text-warm",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

function AdminLessonRequests() {
  const [tab, setTab] = useState<"requests" | "specialties">("requests");
  const [requests, setRequests] = useState<Request[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  // Specialty form
  const [showSpecForm, setShowSpecForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState<string | null>(null);
  const [specForm, setSpecForm] = useState({
    name: "", slug: "", description: "", icon: "📚", price_per_hour: 0, is_active: true, sort_order: 0,
  });

  const load = async () => {
    const [{ data: r }, { data: s }] = await Promise.all([
      supabase.from("lesson_requests").select("*, tutoring_specialties(name, icon)").order("created_at", { ascending: false }),
      supabase.from("tutoring_specialties").select("*").order("sort_order"),
    ]);
    setRequests((r as any) || []);
    setSpecialties(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("lesson_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("تم التحديث"); load(); }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("حذف هذا الطلب؟")) return;
    await supabase.from("lesson_requests").delete().eq("id", id);
    load();
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  // Specialty handlers
  const resetSpecForm = () => {
    setSpecForm({ name: "", slug: "", description: "", icon: "📚", price_per_hour: 0, is_active: true, sort_order: 0 });
    setEditingSpec(null);
    setShowSpecForm(false);
  };

  const editSpec = (s: Specialty) => {
    setSpecForm({
      name: s.name,
      slug: (s as any).slug || "",
      description: s.description || "",
      icon: s.icon || "📚",
      price_per_hour: s.price_per_hour,
      is_active: s.is_active,
      sort_order: s.sort_order,
    });
    setEditingSpec(s.id);
    setShowSpecForm(true);
  };

  const saveSpec = async () => {
    if (!specForm.name.trim() || !specForm.slug.trim()) return toast.error("الاسم والـ slug مطلوبان");
    const payload = { ...specForm, description: specForm.description || null };
    const { error } = editingSpec
      ? await supabase.from("tutoring_specialties").update(payload).eq("id", editingSpec)
      : await supabase.from("tutoring_specialties").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("تم الحفظ"); resetSpecForm(); load(); }
  };

  const deleteSpec = async (id: string) => {
    if (!confirm("حذف هذا التخصص؟ (سيفشل إذا كان مرتبطاً بطلبات)")) return;
    const { error } = await supabase.from("tutoring_specialties").delete().eq("id", id);
    if (error) toast.error("لا يمكن الحذف: " + error.message);
    else load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">حصص أونلاين</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setTab("requests")}
          className={`px-4 py-2 font-semibold text-sm transition-colors -mb-px border-b-2 ${
            tab === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          📨 الطلبات ({requests.filter((r) => r.status === "new").length} جديد)
        </button>
        <button
          onClick={() => setTab("specialties")}
          className={`px-4 py-2 font-semibold text-sm transition-colors -mb-px border-b-2 ${
            tab === "specialties" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          }`}
        >
          🏷️ التخصصات ({specialties.length})
        </button>
      </div>

      {tab === "requests" && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "new", "reviewing", "accepted", "rejected", "completed"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s === "all" ? "الكل" : statusLabel[s]}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
                لا توجد طلبات
              </div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-2xl">{r.tutoring_specialties?.icon || "📚"}</span>
                        <h3 className="font-bold text-foreground">{r.tutoring_specialties?.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[r.status]}`}>
                          {statusLabel[r.status] || r.status}
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                        <div><strong className="text-foreground">الطالب:</strong> {r.student_name}</div>
                        <div dir="ltr" className="text-right"><strong className="text-foreground">الجوال:</strong> {r.phone}</div>
                        {r.education_level && <div><strong className="text-foreground">المرحلة:</strong> {r.education_level}</div>}
                        {r.preferred_time && <div><strong className="text-foreground">الوقت المفضل:</strong> {r.preferred_time}</div>}
                        {r.sessions_per_week && <div><strong className="text-foreground">حصص/أسبوع:</strong> {r.sessions_per_week}</div>}
                        <div><strong className="text-foreground">التاريخ:</strong> {new Date(r.created_at).toLocaleDateString("ar-EG")}</div>
                      </div>
                      {r.notes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-foreground">
                          <strong>ملاحظات الطالب:</strong> {r.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                    <a href={`https://wa.me/${r.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-success">💬 واتساب</Button>
                    </a>
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {Object.entries(statusLabel).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <Button variant="ghost" size="sm" onClick={() => deleteRequest(r.id)} className="text-destructive ms-auto">
                      🗑️ حذف
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "specialties" && (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="hero" onClick={() => { resetSpecForm(); setShowSpecForm(true); }}>+ تخصص جديد</Button>
          </div>

          {showSpecForm && (
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h2 className="font-bold mb-4">{editingSpec ? "✏️ تعديل التخصص" : "➕ تخصص جديد"}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>الاسم *</Label><Input value={specForm.name} onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Slug (إنجليزي بدون مسافات) *</Label><Input value={specForm.slug} onChange={(e) => setSpecForm({ ...specForm, slug: e.target.value })} dir="ltr" placeholder="quran-memorization" /></div>
                <div className="space-y-2 sm:col-span-2"><Label>الوصف</Label><textarea value={specForm.description} onChange={(e) => setSpecForm({ ...specForm, description: e.target.value })} className="flex w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm" /></div>
                <div className="space-y-2"><Label>الأيقونة (إيموجي)</Label><Input value={specForm.icon} onChange={(e) => setSpecForm({ ...specForm, icon: e.target.value })} /></div>
                <div className="space-y-2"><Label>السعر / الساعة (ر.س)</Label><Input type="number" value={specForm.price_per_hour} onChange={(e) => setSpecForm({ ...specForm, price_per_hour: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>الترتيب</Label><Input type="number" value={specForm.sort_order} onChange={(e) => setSpecForm({ ...specForm, sort_order: Number(e.target.value) })} /></div>
                <div className="space-y-2 flex items-end"><label className="flex items-center gap-2"><input type="checkbox" checked={specForm.is_active} onChange={(e) => setSpecForm({ ...specForm, is_active: e.target.checked })} /> مفعّل</label></div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="hero" onClick={saveSpec}>{editingSpec ? "💾 حفظ" : "إضافة"}</Button>
                <Button variant="outline" onClick={resetSpecForm}>إلغاء</Button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-right p-3 font-medium text-muted-foreground">التخصص</th>
                  <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">السعر</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {specialties.map((s) => (
                  <tr key={s.id} className="border-b border-border">
                    <td className="p-3"><span className="text-xl">{s.icon}</span> <span className="font-medium">{s.name}</span></td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{s.price_per_hour} ر.س</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {s.is_active ? "مفعّل" : "متوقف"}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" onClick={() => editSpec(s)}>✏️</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteSpec(s.id)} className="text-destructive">🗑️</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
