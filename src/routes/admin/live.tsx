import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/live")({
  head: () => ({ meta: [{ title: "البث المباشر — معلوم" }] }),
  component: AdminLive,
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
  instructor_id?: string | null;
  instructor_name?: string | null;
  price?: number;
  is_free?: boolean;
  max_seats?: number | null;
  bookings_count?: number;
}

interface LiveSessionPayload {
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  platform: string;
  status: string;
  course_id: string | null;
  instructor_name: string | null;
  is_free: boolean;
  price: number;
  max_seats: number | null;
}

const platformLabel: Record<string, string> = {
  zoom: "Zoom",
  teams: "Microsoft Teams",
  google_meet: "Google Meet",
};

const platformIcon: Record<string, string> = {
  zoom: "🎥",
  teams: "💼",
  google_meet: "📹",
};

const initialForm = {
  title: "",
  description: "",
  scheduled_at: "",
  duration_minutes: 60,
  meeting_link: "",
  platform: "zoom",
  course_id: "",
  status: "upcoming",
  instructor_name: "",
  is_free: true,
  price: 0,
  max_seats: "",
};

function AdminLive() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("live_sessions").select("*").order("scheduled_at", { ascending: false }),
      supabase.from("courses").select("id, title"),
    ]);
    setSessions(s || []);
    setCourses(c || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (s: LiveSession) => {
    // Convert ISO to datetime-local format (YYYY-MM-DDTHH:mm)
    const d = new Date(s.scheduled_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localDateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setForm({
      title: s.title,
      description: s.description || "",
      scheduled_at: localDateTime,
      duration_minutes: s.duration_minutes || 60,
      meeting_link: s.meeting_link || "",
      platform: s.platform,
      course_id: s.course_id || "",
      status: s.status,
      instructor_name: s.instructor_name || "",
      is_free: s.is_free ?? true,
      price: s.price ?? 0,
      max_seats: s.max_seats?.toString() || "",
    });
    setEditingId(s.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.scheduled_at) return;
    const payload: LiveSessionPayload = {
      title: form.title,
      description: form.description || null,
      scheduled_at: form.scheduled_at,
      duration_minutes: form.duration_minutes,
      meeting_link: form.meeting_link || null,
      platform: form.platform,
      status: form.status,
      course_id: form.course_id || null,
      instructor_name: form.instructor_name || null,
      is_free: form.is_free,
      price: form.is_free ? 0 : Number(form.price) || 0,
      max_seats: form.max_seats ? Number(form.max_seats) : null,
    };
    if (editingId) {
      await supabase.from("live_sessions").update(payload).eq("id", editingId);
    } else {
      await supabase.from("live_sessions").insert(payload);
    }
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا البث؟")) return;
    await supabase.from("live_sessions").delete().eq("id", id);
    load();
  };

  const statusLabel: Record<string, string> = {
    upcoming: "قادم",
    live: "مباشر الآن",
    completed: "منتهي",
    cancelled: "ملغي",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">البث المباشر</h1>
        <Button variant="hero" onClick={() => { resetForm(); setShowForm(true); }}>+ بث جديد</Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {editingId ? "✏️ تعديل البث" : "➕ بث جديد"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>عنوان البث *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>الوصف</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="وصف مختصر للبث (اختياري)"
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
              <Label>الحالة</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="upcoming">قادم</option>
                <option value="live">مباشر الآن</option>
                <option value="completed">منتهي</option>
                <option value="cancelled">ملغي</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>رابط الاجتماع</Label>
              <Input
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                dir="ltr"
                placeholder={
                  form.platform === "zoom" ? "https://zoom.us/j/..." :
                  form.platform === "teams" ? "https://teams.microsoft.com/l/meetup-join/..." :
                  "https://meet.google.com/xxx-xxxx-xxx"
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>الكورس (اختياري)</Label>
              <select
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">بدون كورس</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="hero" onClick={handleSave}>{editingId ? "💾 حفظ التعديلات" : "إضافة"}</Button>
            <Button variant="outline" onClick={resetForm}>إلغاء</Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-medium text-muted-foreground">البث</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">التاريخ</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد بثوث</td></tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{platformIcon[s.platform] || "🎥"}</span>
                        <span>{s.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{platformLabel[s.platform] || s.platform}</div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">
                      {new Date(s.scheduled_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })}
                      {" "}
                      {new Date(s.scheduled_at).toLocaleTimeString("ar-EG", { timeStyle: "short" })}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        s.status === "upcoming" ? "bg-primary/10 text-primary" :
                        s.status === "live" ? "bg-destructive/10 text-destructive" :
                        s.status === "completed" ? "bg-success/10 text-success" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {statusLabel[s.status] || s.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 items-center">
                        {s.meeting_link && (() => {
                          const link = s.meeting_link.trim();
                          const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
                          return (
                            <a href={url} target="_blank" rel="noopener noreferrer" title="انضم كمدير">
                              <Button variant="ghost" size="sm" className="text-primary">👁️</Button>
                            </a>
                          );
                        })()}
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)} title="تعديل">✏️</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-destructive" title="حذف">🗑️</Button>
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
