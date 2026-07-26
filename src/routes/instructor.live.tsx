import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { computeTiming, statusLabel } from "@/lib/liveSession";

export const Route = createFileRoute("/instructor/live")({
  head: () => ({ meta: [{ title: "حصصي المباشرة — معلوم" }] }),
  component: InstructorLivePage,
});

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_link: string | null;
  platform: string;
  status: string;
  course_id: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  price: number;
  is_free: boolean;
  max_seats: number | null;
  bookings_count: number;
  join_window_minutes: number;
}

const initialForm = {
  title: "",
  description: "",
  scheduled_at: "",
  duration_minutes: 60,
  meeting_link: "",
  platform: "zoom",
  status: "upcoming",
  is_free: true,
  price: 0,
  max_seats: "",
  join_window_minutes: 15,
};

function InstructorLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [userId, setUserId] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState<string>("");
  const [viewBookingsFor, setViewBookingsFor] = useState<string | null>(null);
  const [bookingsList, setBookingsList] = useState<any[]>([]);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    setUserId(uid);
    if (!uid) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("user_id", uid).maybeSingle();
    setInstructorName(profile?.full_name || "");

    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("instructor_id", uid)
      .order("scheduled_at", { ascending: false });
    setSessions((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(initialForm); setEditingId(null); setShowForm(false); };

  const handleEdit = (s: LiveSession) => {
    const d = new Date(s.scheduled_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    setForm({
      title: s.title,
      description: s.description || "",
      scheduled_at: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      duration_minutes: s.duration_minutes || 60,
      meeting_link: s.meeting_link || "",
      platform: s.platform,
      status: s.status,
      is_free: s.is_free,
      price: s.price,
      max_seats: s.max_seats?.toString() || "",
      join_window_minutes: s.join_window_minutes,
    });
    setEditingId(s.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!form.title.trim() || !form.scheduled_at) {
      toast.error("العنوان والتاريخ مطلوبان");
      return;
    }
    const payload: any = {
      title: form.title,
      description: form.description || null,
      scheduled_at: form.scheduled_at,
      duration_minutes: form.duration_minutes,
      meeting_link: form.meeting_link || null,
      platform: form.platform,
      status: form.status,
      is_free: form.is_free,
      price: form.is_free ? 0 : Number(form.price) || 0,
      max_seats: form.max_seats ? Number(form.max_seats) : null,
      join_window_minutes: Number(form.join_window_minutes) || 15,
      instructor_id: userId,
      instructor_name: instructorName || "مدرس",
    };
    if (editingId) {
      const { error } = await supabase.from("live_sessions").update(payload).eq("id", editingId);
      if (error) { toast.error("تعذّر الحفظ", { description: error.message }); return; }
      toast.success("تم تحديث الحصة");
    } else {
      const { error } = await supabase.from("live_sessions").insert(payload);
      if (error) { toast.error("تعذّر الإضافة", { description: error.message }); return; }
      toast.success("✅ تم إنشاء الحصة");
    }
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه الحصة؟ سيتم إلغاء كل الحجوزات.")) return;
    const { error } = await supabase.from("live_sessions").delete().eq("id", id);
    if (error) { toast.error("تعذّر الحذف", { description: error.message }); return; }
    toast.success("تم الحذف");
    load();
  };

  const handleStartLive = async (id: string) => {
    const { error } = await supabase.from("live_sessions").update({ status: "live" }).eq("id", id);
    if (error) { toast.error("تعذّر التحديث"); return; }
    toast.success("الحصة الآن مباشرة 🔴");
    load();
  };

  const handleEndLive = async (id: string) => {
    const { error } = await supabase.from("live_sessions").update({ status: "completed" }).eq("id", id);
    if (error) { toast.error("تعذّر التحديث"); return; }
    toast.success("تم إنهاء الحصة");
    load();
  };

  const viewBookings = async (id: string) => {
    setViewBookingsFor(id);
    const { data } = await supabase
      .from("live_session_bookings" as any)
      .select("id, user_id, status, joined_at, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: false });

    const bookings = (data as any) || [];
    if (bookings.length === 0) { setBookingsList([]); return; }

    const userIds = bookings.map((b: any) => b.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);
    const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    setBookingsList(bookings.map((b: any) => ({ ...b, profile: profMap.get(b.user_id) })));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">حصصي المباشرة</h1>
          <p className="text-sm text-muted-foreground mt-1">أنشئ وادر حصصك المباشرة</p>
        </div>
        <Button variant="hero" onClick={() => { resetForm(); setShowForm(true); }}>+ حصة جديدة</Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {editingId ? "✏️ تعديل الحصة" : "➕ حصة جديدة"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>عنوان الحصة *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>الوصف</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="ماذا سيتعلم الطلاب في هذه الحصة؟"
              />
            </div>
            <div className="space-y-2">
              <Label>التاريخ والوقت *</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>المدة (دقيقة)</Label>
              <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>منصة الاجتماع</Label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="zoom">🎥 Zoom</option>
                <option value="teams">💼 Microsoft Teams</option>
                <option value="google_meet">📹 Google Meet</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>عدد المقاعد (اتركه فارغاً للامحدود)</Label>
              <Input type="number" value={form.max_seats} onChange={(e) => setForm({ ...form, max_seats: e.target.value })} placeholder="مثال: 30" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>رابط الاجتماع *</Label>
              <Input
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                dir="ltr"
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_free}
                  onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
                  className="h-4 w-4"
                />
                حصة مجانية
              </Label>
            </div>
            {!form.is_free && (
              <div className="space-y-2">
                <Label>السعر (ر.س)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>السماح بالانضمام قبل (دقيقة)</Label>
              <Input type="number" value={form.join_window_minutes} onChange={(e) => setForm({ ...form, join_window_minutes: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="hero" onClick={handleSave}>{editingId ? "💾 حفظ" : "إنشاء الحصة"}</Button>
            <Button variant="outline" onClick={resetForm}>إلغاء</Button>
          </div>
        </div>
      )}

      {viewBookingsFor && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">👥 الطلاب المسجلين</h2>
            <Button variant="ghost" size="sm" onClick={() => setViewBookingsFor(null)}>إغلاق ✕</Button>
          </div>
          {bookingsList.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">لا يوجد طلاب مسجلين بعد</p>
          ) : (
            <div className="space-y-2">
              {bookingsList.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="font-medium text-foreground">{b.profile?.full_name || "طالب"}</p>
                    {b.profile?.phone && <p className="text-xs text-muted-foreground" dir="ltr">{b.profile.phone}</p>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleDateString("ar-EG")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📡</div>
            <h3 className="text-lg font-bold text-foreground mb-2">لا توجد حصص</h3>
            <p className="text-muted-foreground mb-4">ابدأ بإنشاء حصتك الأولى</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((s) => {
              const timing = computeTiming(s.scheduled_at, s.duration_minutes, s.join_window_minutes, s.status);
              return (
                <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-foreground">{s.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        timing.status === "live" ? "bg-destructive/10 text-destructive" :
                        timing.status === "ended" ? "bg-muted text-muted-foreground" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {statusLabel[timing.status]}
                      </span>
                      {s.is_free ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">مجاني</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-warm/10 text-warm">{s.price} ر.س</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                      <span>📅 {new Date(s.scheduled_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span>⏱️ {s.duration_minutes} د</span>
                      <span>👥 {s.bookings_count} حجز{s.max_seats ? ` / ${s.max_seats}` : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => viewBookings(s.id)} title="الطلاب">👥</Button>
                    {timing.status === "upcoming" && (
                      <Button variant="ghost" size="sm" onClick={() => handleStartLive(s.id)} title="بدء البث" className="text-destructive">▶️ بدء</Button>
                    )}
                    {timing.status === "live" && (
                      <Button variant="ghost" size="sm" onClick={() => handleEndLive(s.id)} title="إنهاء">⏹️ إنهاء</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s)} title="تعديل">✏️</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive" title="حذف">🗑️</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
