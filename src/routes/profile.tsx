import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { downloadCertificatePDF } from "@/lib/certificate";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "ملفي الشخصي — معلوم" },
      { name: "description", content: "إدارة ملفك الشخصي ومتابعة تقدمك في الكورسات" },
    ],
  }),
  component: ProfilePage,
});

interface Profile {
  full_name: string;
  education_level: string | null;
  avatar_url: string | null;
  phone: string | null;
  age: number | null;
}

interface Enrollment {
  id: string;
  progress: number;
  completed: boolean;
  enrolled_at: string;
  courses: {
    id: string;
    title: string;
    category: string;
    instructor: string;
    image_url: string | null;
  };
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  item_title?: string;
  item_type: "course" | "book" | "live_session" | "other";
}

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  course_id: string | null;
  book_id: string | null;
  live_session_id: string | null;
  courses: { title: string } | null;
  books: { title: string } | null;
  live_sessions: { title: string } | null;
}

interface Certificate {
  id: string;
  verification_code: string;
  issued_at: string;
  quiz_score: number | null;
  courses: { id: string; title: string; instructor: string; level: string } | null;
}

interface LessonRequest {
  id: string;
  status: string;
  created_at: string;
  preferred_time: string | null;
  sessions_per_week: number | null;
  tutoring_specialties: { name: string; icon: string | null } | null;
}

type TabKey = "overview" | "courses" | "tutoring" | "certificates" | "payments" | "settings";

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "نظرة عامة", icon: "🏠" },
  { key: "courses", label: "كورساتي", icon: "📚" },
  { key: "tutoring", label: "حصصي", icon: "🎓" },
  { key: "certificates", label: "شهاداتي", icon: "🏅" },
  { key: "payments", label: "المدفوعات", icon: "💳" },
  { key: "settings", label: "الإعدادات", icon: "⚙️" },
];

const requestStatusLabel: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-primary/10 text-primary" },
  reviewing: { label: "قيد المراجعة", color: "bg-warm/10 text-warm" },
  accepted: { label: "مقبول", color: "bg-success/10 text-success" },
  rejected: { label: "مرفوض", color: "bg-destructive/10 text-destructive" },
  completed: { label: "مكتمل", color: "bg-muted text-muted-foreground" },
};

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // Settings form
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/login" }); return; }
      setUser(session.user);
      await Promise.all([
        loadProfile(session.user.id),
        loadEnrollments(session.user.id),
        loadPayments(session.user.id),
        loadCertificates(session.user.id),
        loadRequests(session.user.id),
      ]);
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate({ to: "/login" });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, education_level, avatar_url, phone, age")
      .eq("user_id", userId)
      .single();
    if (data) {
      setProfile(data);
      setEditName(data.full_name);
      setEditLevel(data.education_level || "ثانوي");
      setEditPhone(data.phone || "");
      setEditAge(data.age ? String(data.age) : "");
    }
  };

  const loadEnrollments = async (userId: string) => {
    const { data } = await supabase
      .from("enrollments")
      .select("id, progress, completed, enrolled_at, courses(id, title, category, instructor, image_url)")
      .eq("user_id", userId);
    if (data) setEnrollments(data as unknown as Enrollment[]);
  };

  const loadPayments = async (userId: string) => {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, currency, status, created_at, course_id, book_id, live_session_id, courses(title), books(title), live_sessions(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) {
      setPayments((data as PaymentRow[]).map((p) => {
        const itemType: Payment["item_type"] = p.course_id ? "course" : p.book_id ? "book" : p.live_session_id ? "live_session" : "other";
        const title = p.courses?.title || p.books?.title || p.live_sessions?.title;
        return {
          id: p.id, amount: p.amount, currency: p.currency, status: p.status,
          created_at: p.created_at, item_title: title, item_type: itemType,
        };
      }));
    }
  };

  const loadCertificates = async (userId: string) => {
    const { data } = await supabase
      .from("certificates")
      .select("id, verification_code, issued_at, quiz_score, courses(id, title, instructor, level)")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    if (data) setCertificates(data as unknown as Certificate[]);
  };

  const loadRequests = async (userId: string) => {
    const { data } = await supabase
      .from("lesson_requests")
      .select("id, status, created_at, preferred_time, sessions_per_week, tutoring_specialties(name, icon)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setRequests(data as unknown as LessonRequest[]);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editName.trim(),
        education_level: editLevel,
        phone: editPhone.trim() || null,
        age: editAge ? parseInt(editAge) : null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("خطأ: " + error.message);
    else {
      toast.success("تم حفظ التعديلات ✓");
      setProfile((p) => p ? { ...p, full_name: editName, education_level: editLevel, phone: editPhone || null, age: editAge ? parseInt(editAge) : null } : p);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("الحجم الأقصى 2 ميجا");

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setProfile((p) => p ? { ...p, avatar_url: publicUrl } : p);
    setUploadingAvatar(false);
    toast.success("تم تحديث الصورة ✓");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] py-8">
        <div className="mx-auto max-w-5xl px-4 space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const completedCount = enrollments.filter((e) => e.completed).length;
  const inProgressCount = enrollments.filter((e) => !e.completed && e.progress > 0).length;
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.progress || 0), 0) / enrollments.length)
    : 0;

  return (
    <div className="min-h-[80vh] bg-muted/20">
      {/* Banner + Avatar header */}
      <div className="relative">
        <div className="h-40 sm:h-52 gradient-hero relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }} />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="-mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row sm:items-end gap-4 pb-6">
            {/* Avatar */}
            <div className="relative group mx-auto sm:mx-0">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-background bg-card overflow-hidden shadow-xl">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-hero flex items-center justify-center text-primary-foreground text-5xl font-bold">
                    {profile?.full_name?.[0] || "م"}
                  </div>
                )}
              </div>
              <label className="absolute bottom-1 end-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                {uploadingAvatar ? "..." : "📷"}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
              </label>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-right sm:pb-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                {profile?.full_name || "مستخدم جديد"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
                <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">
                  🎓 {profile?.education_level || "ثانوي"}
                </span>
                {certificates.length > 0 && (
                  <span className="text-xs font-bold bg-warm/10 text-warm px-3 py-1 rounded-full">
                    🏅 {certificates.length} شهادة
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-center sm:justify-end sm:pb-2">
              <Button variant="outline" size="sm" onClick={() => setActiveTab("settings")}>✏️ تعديل</Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive">خروج</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-12">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard icon="📚" value={enrollments.length} label="كورساتي" color="text-primary" />
          <StatCard icon="✅" value={completedCount} label="مكتمل" color="text-success" />
          <StatCard icon="⏳" value={inProgressCount} label="قيد التعلم" color="text-warm" />
          <StatCard icon="📊" value={`${avgProgress}%`} label="متوسط التقدم" color="text-foreground" />
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex overflow-x-auto border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeTab === t.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6">
            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Continue learning */}
                <div>
                  <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                    <span>▶️</span> أكمل التعلم
                  </h3>
                  {enrollments.filter(e => !e.completed && e.progress > 0).slice(0, 3).length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                      ابدأ كورس جديد من <Link to="/courses" className="text-primary font-bold">صفحة الكورسات</Link>
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {enrollments.filter(e => !e.completed && e.progress > 0).slice(0, 3).map((e) => (
                        <EnrollmentRow key={e.id} enrollment={e} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent certificates */}
                {certificates.length > 0 && (
                  <div>
                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <span>🏅</span> أحدث شهاداتك
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {certificates.slice(0, 2).map((c) => (
                        <CertificateCard key={c.id} certificate={c} studentName={profile?.full_name || "طالب"} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
                  <QuickLink to="/dashboard" icon="🏠" label="لوحتي" />
                  <QuickLink to="/courses" icon="🔍" label="تصفح الكورسات" />
                  <QuickLink to="/tutoring" icon="🎓" label="اطلب حصة" />
                  <QuickLink to="/my-courses" icon="📖" label="كورساتي" />
                </div>
              </div>
            )}

            {/* Courses */}
            {activeTab === "courses" && (
              <div>
                {enrollments.length === 0 ? (
                  <EmptyState icon="📚" message="لسه ما سجلت في أي كورس" actionLabel="تصفح الكورسات" actionTo="/courses" />
                ) : (
                  <div className="space-y-3">
                    {enrollments.map((e) => <EnrollmentRow key={e.id} enrollment={e} />)}
                  </div>
                )}
              </div>
            )}

            {/* Tutoring requests */}
            {activeTab === "tutoring" && (
              <div>
                {requests.length === 0 ? (
                  <EmptyState icon="🎓" message="لم تطلب أي حصة بعد" actionLabel="اطلب حصة الآن" actionTo="/tutoring" />
                ) : (
                  <div className="space-y-3">
                    {requests.map((r) => (
                      <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                        <div className="text-3xl">{r.tutoring_specialties?.icon || "📚"}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{r.tutoring_specialties?.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString("ar-EG")}
                            {r.preferred_time && ` · ${r.preferred_time}`}
                            {r.sessions_per_week && ` · ${r.sessions_per_week} حصة/أسبوع`}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${requestStatusLabel[r.status]?.color || "bg-muted"}`}>
                          {requestStatusLabel[r.status]?.label || r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Certificates */}
            {activeTab === "certificates" && (
              <div>
                {certificates.length === 0 ? (
                  <EmptyState icon="🏅" message="لم تحصل على شهادات بعد. أكمل كورساً للحصول على شهادتك الأولى!" actionLabel="تصفح الكورسات" actionTo="/courses" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {certificates.map((c) => <CertificateCard key={c.id} certificate={c} studentName={profile?.full_name || "طالب"} />)}
                  </div>
                )}
              </div>
            )}

            {/* Payments */}
            {activeTab === "payments" && (
              <div>
                {payments.length === 0 ? (
                  <EmptyState icon="💳" message="لا توجد مدفوعات بعد" />
                ) : (
                  <>
                    <div className="bg-gradient-to-br from-success/10 to-transparent rounded-xl p-4 mb-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">إجمالي المدفوع</span>
                      <span className="text-2xl font-extrabold text-success" dir="ltr">
                        ${payments.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-right">
                            <th className="pb-3 font-medium text-muted-foreground text-xs">التاريخ</th>
                            <th className="pb-3 font-medium text-muted-foreground text-xs">الكورس</th>
                            <th className="pb-3 font-medium text-muted-foreground text-xs">المبلغ</th>
                            <th className="pb-3 font-medium text-muted-foreground text-xs">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id} className="border-b border-border/50 last:border-0">
                              <td className="py-3 text-muted-foreground text-xs whitespace-nowrap">
                                {new Date(p.created_at).toLocaleDateString("ar-EG")}
                              </td>
                              <td className="py-3 text-foreground">
                                {p.item_type === "book" ? "📖 " : p.item_type === "live_session" ? "🎥 " : "📚 "}
                                {p.item_title || "—"}
                              </td>
                              <td className="py-3 font-semibold text-foreground" dir="ltr">{Number(p.amount).toFixed(2)} {p.currency}</td>
                              <td className="py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  p.status === "completed" ? "bg-success/10 text-success"
                                  : p.status === "failed" ? "bg-destructive/10 text-destructive"
                                  : "bg-muted text-muted-foreground"
                                }`}>
                                  {p.status === "completed" ? "مكتمل" : p.status === "failed" ? "فشل" : "قيد المعالجة"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Settings */}
            {activeTab === "settings" && (
              <div className="space-y-5 max-w-xl">
                <h3 className="font-bold text-foreground">معلومات الحساب</h3>
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المرحلة الدراسية</Label>
                    <Select value={editLevel} onValueChange={setEditLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ابتدائي">ابتدائي</SelectItem>
                        <SelectItem value="إعدادي">إعدادي</SelectItem>
                        <SelectItem value="متوسط">متوسط</SelectItem>
                        <SelectItem value="ثانوي">ثانوي</SelectItem>
                        <SelectItem value="جامعة">جامعة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>العمر</Label>
                    <Input type="number" min={5} max={99} value={editAge} onChange={(e) => setEditAge(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>رقم الجوال (واتساب)</Label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} dir="ltr" placeholder="05xxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={user?.email || ""} disabled dir="ltr" />
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني لا يمكن تعديله</p>
                </div>
                <Button variant="hero" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                  {saving ? "جاري الحفظ..." : "💾 حفظ التعديلات"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 text-center card-hover">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl sm:text-3xl font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function EnrollmentRow({ enrollment }: { enrollment: Enrollment }) {
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: enrollment.courses?.id || "" }}
      className="flex items-center gap-4 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
    >
      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
        {enrollment.courses?.image_url ? (
          <img src={enrollment.courses.image_url} alt={enrollment.courses.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full gradient-hero" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm truncate">{enrollment.courses?.title}</h3>
        <p className="text-xs text-muted-foreground mb-1.5">{enrollment.courses?.instructor}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full gradient-hero rounded-full transition-all duration-500" style={{ width: `${enrollment.progress}%` }} />
          </div>
          <span className="text-xs font-bold text-muted-foreground shrink-0">{enrollment.progress}%</span>
        </div>
      </div>
      {enrollment.completed && (
        <span className="text-xs font-bold bg-success/10 text-success px-2 py-1 rounded-full shrink-0">✓ مكتمل</span>
      )}
    </Link>
  );
}

function CertificateCard({ certificate, studentName }: { certificate: Certificate; studentName: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nameToUse, setNameToUse] = useState(studentName);
  const [downloading, setDownloading] = useState(false);

  // Keep dialog name in sync if profile name changes
  useEffect(() => {
    setNameToUse(studentName);
  }, [studentName]);

  const openConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNameToUse(studentName);
    setConfirmOpen(true);
  };

  const confirmAndDownload = async () => {
    const finalName = nameToUse.trim();
    if (!finalName) {
      toast.error("الرجاء إدخال الاسم الذي سيظهر على الشهادة");
      return;
    }
    setDownloading(true);
    try {
      await downloadCertificatePDF({
        studentName: finalName,
        courseTitle: certificate.courses?.title || "كورس",
        instructor: certificate.courses?.instructor || "—",
        issuedAt: certificate.issued_at,
        verificationCode: certificate.verification_code,
        quizScore: certificate.quiz_score,
        level: certificate.courses?.level || null,
      });
      toast.success("تم تحميل الشهادة 📄");
      setConfirmOpen(false);
    } catch {
      toast.error("تعذّر إنشاء ملف PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-warm/10 via-card to-primary/5 rounded-xl border border-warm/20 p-4 card-hover flex flex-col">
      <Link
        to="/certificates/$code"
        params={{ code: certificate.verification_code }}
        className="flex items-start gap-3 flex-1"
      >
        <div className="text-3xl shrink-0">🏅</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground text-sm line-clamp-2">{certificate.courses?.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(certificate.issued_at).toLocaleDateString("ar-EG")}
          </p>
          {certificate.quiz_score !== null && (
            <p className="text-xs font-bold text-success mt-1">الدرجة: {certificate.quiz_score}%</p>
          )}
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-warm/15">
        <Button
          variant="hero"
          size="sm"
          className="text-xs h-8"
          onClick={openConfirm}
        >
          📄 تحميل PDF
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="text-xs h-8"
        >
          <Link to="/certificates/$code" params={{ code: certificate.verification_code }}>
            👁️ عرض
          </Link>
        </Button>
      </div>

      {/* Verify name dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الاسم على الشهادة</DialogTitle>
            <DialogDescription>
              تأكد أن الاسم التالي صحيح كما تريده أن يظهر على شهادة "{certificate.courses?.title}". لا يمكن تعديله بعد التحميل.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="cert-name">الاسم الذي سيظهر على الشهادة</Label>
            <Input
              id="cert-name"
              value={nameToUse}
              onChange={(e) => setNameToUse(e.target.value)}
              maxLength={80}
              placeholder="الاسم الكامل"
              className="text-base font-semibold"
            />
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-center">
              <p className="text-[11px] text-muted-foreground mb-1">معاينة الاسم</p>
              <p className="text-lg font-extrabold text-primary truncate">
                {nameToUse.trim() || "—"}
              </p>
            </div>
            {nameToUse.trim() !== studentName.trim() && (
              <p className="text-[11px] text-warm">
                ℹ️ لتغيير الاسم بشكل دائم، عدّله من تبويب «الإعدادات».
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={downloading}>
              إلغاء
            </Button>
            <Button variant="hero" onClick={confirmAndDownload} disabled={downloading || !nameToUse.trim()}>
              {downloading ? "جاري التحميل..." : "✓ تأكيد وتحميل PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-center">
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </Link>
  );
}

function EmptyState({ icon, message, actionLabel, actionTo }: { icon: string; message: string; actionLabel?: string; actionTo?: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-muted-foreground text-sm mb-4">{message}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo}>
          <Button variant="hero" size="sm">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
