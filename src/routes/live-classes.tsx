import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LiveSessionCard, type LiveSessionCardData } from "@/components/LiveSessionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLiveSessionCheckout } from "@/hooks/useLiveSessionCheckout";

export const Route = createFileRoute("/live-classes")({
  head: () => ({
    meta: [
      { title: "الحصص المباشرة — معلوم" },
      { name: "description", content: "احجز حصصك المباشرة على معلوم: زووم، Google Meet وMicrosoft Teams. حصص قادمة لكل التخصصات." },
      { property: "og:title", content: "الحصص المباشرة — معلوم" },
      { property: "og:description", content: "احجز حصصك المباشرة على معلوم لكل التخصصات." },
    ],
  }),
  component: LiveClassesPage,
});

type Filter = "all" | "upcoming" | "live" | "free";

function LiveClassesPage() {
  const [sessions, setSessions] = useState<LiveSessionCardData[]>([]);
  const [bookings, setBookings] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  const { openCheckout } = useLiveSessionCheckout();

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    setUserId(uid);
    setUserEmail(session?.user?.email);

    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true });
    setSessions((data as any) || []);

    if (uid) {
      const { data: b } = await supabase
        .from("live_session_bookings" as any)
        .select("session_id")
        .eq("user_id", uid)
        .eq("status", "confirmed");
      setBookings(new Set(((b as any) || []).map((r: any) => r.session_id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") === "success") {
      toast.success("✅ تم الدفع بنجاح!", {
        description: "تم تأكيد حجزك في الحصة. ستتلقى إشعارًا قبل بدء الحصة.",
      });
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
  }, [load]);

  const handleBook = async (s: LiveSessionCardData) => {
    if (!userId) {
      toast.error("سجّل الدخول أولاً للحجز");
      return;
    }
    // Paid session → Stripe checkout
    if (!s.is_free && s.price > 0) {
      await openCheckout({ sessionId: s.id, customerEmail: userEmail });
      return;
    }
    // Free session → direct booking
    setBookingLoadingId(s.id);
    const { error } = await supabase
      .from("live_session_bookings" as any)
      .insert({ session_id: s.id, user_id: userId, status: "confirmed" });
    setBookingLoadingId(null);
    if (error) {
      if (error.code === "23505") {
        toast.info("أنت محجوز بالفعل في هذه الحصة");
      } else if (error.message?.includes("live_session_full")) {
        toast.error("المقاعد مكتملة");
      } else {
        toast.error("تعذّر الحجز", { description: error.message });
      }
      return;
    }
    toast.success("✅ تم تأكيد حجزك!", { description: "ستتلقى إشعارًا قبل بدء الحصة." });
    load();
  };

  const handleCancel = async (s: LiveSessionCardData) => {
    if (!userId) return;
    if (!confirm("هل تريد إلغاء حجز هذه الحصة؟")) return;
    const { error } = await supabase
      .from("live_session_bookings" as any)
      .delete()
      .eq("session_id", s.id)
      .eq("user_id", userId);
    if (error) {
      toast.error("تعذّر الإلغاء", { description: error.message });
      return;
    }
    toast.success("تم إلغاء الحجز");
    load();
  };

  const now = Date.now();
  const filtered = sessions.filter((s) => {
    const start = new Date(s.scheduled_at).getTime();
    const end = start + (s.duration_minutes || 60) * 60 * 1000;
    if (filter === "upcoming") return start > now && s.status !== "completed";
    if (filter === "live") return (s.status === "live" || (start <= now && end > now)) && s.status !== "completed";
    if (filter === "free") return s.is_free;
    return true;
  });

  return (
    <div className="min-h-[80vh]">
      {/* Hero */}
      <section className="gradient-hero py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-warm animate-pulse" />
            <span className="text-primary-foreground/90 text-sm font-medium">بث مباشر</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4">
            الحصص <span className="text-warm">المباشرة</span>
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            انضم لحصص مباشرة تفاعلية مع نخبة من المدرسين على Zoom وGoogle Meet وMicrosoft Teams
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: "all", label: "الكل" },
            { id: "upcoming", label: "القادمة" },
            { id: "live", label: "مباشرة الآن" },
            { id: "free", label: "مجاناً" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as Filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="text-5xl mb-3">📡</div>
            <h3 className="text-lg font-bold text-foreground mb-2">لا توجد حصص</h3>
            <p className="text-muted-foreground mb-6">
              {filter === "all" ? "لم تتم إضافة حصص بعد. عُد لاحقاً." : "لا توجد حصص في هذا التصنيف حالياً."}
            </p>
            {!userId && (
              <Link to="/signup">
                <Button variant="hero">سجّل لتلقي إشعارات الحصص</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => (
              <LiveSessionCard
                key={s.id}
                session={s}
                isBooked={bookings.has(s.id)}
                bookingLoading={bookingLoadingId === s.id}
                onBook={() => handleBook(s)}
                onCancelBooking={() => handleCancel(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
