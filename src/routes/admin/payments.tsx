import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "المدفوعات — معلوم" }] }),
  component: AdminPayments,
});

interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_provider: string | null;
  stripe_session_id: string | null;
  created_at: string;
  user_id: string;
  course_id: string | null;
  live_session_id?: string | null;
  course_title?: string;
  user_name?: string;
}

const statusColor: Record<string, string> = {
  completed: "bg-success/10 text-success",
  pending: "bg-warm/15 text-warm-foreground",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  completed: "ناجح",
  pending: "قيد الانتظار",
  failed: "فاشل",
  refunded: "مسترد",
};

function AdminPayments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: pays } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!pays) { setLoading(false); return; }

    // Fetch course titles + live session titles + user names in batch
    const courseIds = [...new Set(pays.map((p) => p.course_id).filter((x): x is string => !!x))];
    const sessionIds = [...new Set(pays.map((p: any) => p.live_session_id).filter((x: any): x is string => !!x))];
    const userIds = [...new Set(pays.map((p) => p.user_id))];

    const [coursesRes, sessionsRes, profilesRes] = await Promise.all([
      courseIds.length ? supabase.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] as any[] }),
      sessionIds.length ? supabase.from("live_sessions").select("id, title").in("id", sessionIds) : Promise.resolve({ data: [] as any[] }),
      supabase.from("profiles").select("user_id, full_name").in("user_id", userIds),
    ]);

    const courseMap = Object.fromEntries((coursesRes.data || []).map((c: any) => [c.id, c.title]));
    const sessionMap = Object.fromEntries((sessionsRes.data || []).map((c: any) => [c.id, c.title]));
    const userMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.user_id, p.full_name]));

    setPayments(
      pays.map((p: any) => ({
        ...p,
        course_title: p.course_id
          ? courseMap[p.course_id] || "—"
          : p.live_session_id
            ? `🎥 ${sessionMap[p.live_session_id] || "حصة مباشرة"}`
            : "—",
        user_name: userMap[p.user_id] || "—",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = payments.filter((p) => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch =
      !search ||
      p.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.course_title?.toLowerCase().includes(search.toLowerCase()) ||
      p.stripe_session_id?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: payments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0),
    completed: payments.filter((p) => p.status === "completed").length,
    failed: payments.filter((p) => p.status === "failed").length,
    pending: payments.filter((p) => p.status === "pending").length,
  };

  // Last 30 days revenue
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { date: d, total: 0 };
  });
  payments.filter((p) => p.status === "completed").forEach((p) => {
    const d = new Date(p.created_at);
    const dayIndex = last30Days.findIndex((x) => x.date.toDateString() === d.toDateString());
    if (dayIndex >= 0) last30Days[dayIndex].total += Number(p.amount);
  });
  const maxRevenue = Math.max(...last30Days.map((x) => x.total), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">💳 المدفوعات</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">الإيرادات</div>
          <div className="text-2xl font-bold text-success">${stats.total.toFixed(2)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">عمليات ناجحة</div>
          <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">قيد الانتظار</div>
          <div className="text-2xl font-bold text-warm-foreground">{stats.pending}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">فشلت</div>
          <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
        </div>
      </div>

      {/* 30-day chart */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="text-sm font-bold text-foreground mb-3">الإيرادات — آخر 30 يوم</div>
        <div className="flex items-end gap-1 h-24" dir="ltr">
          {last30Days.map((d, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors relative group"
              style={{ height: `${(d.total / maxRevenue) * 100}%`, minHeight: d.total > 0 ? "4px" : "1px" }}
              title={`${d.date.toLocaleDateString("ar-EG")}: $${d.total.toFixed(2)}`}
            >
              {d.total > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-100 bg-foreground text-background px-1 rounded whitespace-nowrap">
                  ${d.total.toFixed(0)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="بحث بالاسم، الكورس، أو رقم العملية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:w-48"
        >
          <option value="all">كل الحالات</option>
          <option value="completed">ناجحة</option>
          <option value="pending">قيد الانتظار</option>
          <option value="failed">فاشلة</option>
          <option value="refunded">مستردة</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-3 font-medium text-muted-foreground">الطالب</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الكورس</th>
                <th className="text-right p-3 font-medium text-muted-foreground">المبلغ</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">التاريخ</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">رقم العملية</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا توجد مدفوعات</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{p.user_name}</td>
                    <td className="p-3 text-muted-foreground">{p.course_title}</td>
                    <td className="p-3 font-bold">{p.currency === "USD" ? `$${Number(p.amount).toFixed(2)}` : `${p.amount} ${p.currency}`}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor[p.status] || "bg-muted"}`}>
                        {statusLabel[p.status] || p.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">
                      {new Date(p.created_at).toLocaleDateString("ar-EG", { dateStyle: "short" })}
                    </td>
                    <td className="p-3 text-muted-foreground hidden lg:table-cell font-mono text-xs" dir="ltr">
                      {p.stripe_session_id?.slice(0, 20) || "—"}
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
