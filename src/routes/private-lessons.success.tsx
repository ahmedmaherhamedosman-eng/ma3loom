import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CalendarPlus, CheckCircle2, MailCheck, BellRing, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/private-lessons/success")({
  head: () => ({ meta: [{ title: "تم تأكيد الحجز — معلوم" }] }),
  component: PrivateLessonsSuccess,
});

interface BookingResult {
  id: string;
  subject: string;
  lesson_date: string | null;
  lesson_time: string | null;
  student_name: string;
  total_amount: number;
}

function PrivateLessonsSuccess() {
  const [booking, setBooking] = useState<BookingResult | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const bookingId = search.get("bookingId");
    if (!bookingId) return;

    const load = async () => {
      const { data } = await supabase
        .from("private_lesson_bookings")
        .select("id,subject,lesson_date,lesson_time,student_name,total_amount")
        .eq("id", bookingId)
        .maybeSingle();

      if (data) setBooking(data as BookingResult);
    };

    void load();
  }, []);

  const googleCalendarLink = booking
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`حصة خصوصية - ${booking.subject}`)}&details=${encodeURIComponent("حجز منصة معلوم")}`
    : "#";

  return (
    <div className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-success/30 bg-success/10 p-8 text-center">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
          <h1 className="text-3xl font-extrabold text-foreground mb-3">تم تأكيد حجزك بنجاح</h1>
          <p className="text-muted-foreground mb-6">
            تم تسجيل الحجز، وسيصلك تأكيد عبر البريد والإشعارات داخل المنصة.
          </p>

          {booking && (
            <div className="rounded-2xl border border-border bg-card p-4 text-start mb-6">
              <p className="text-sm text-muted-foreground mb-1">الطالب: <strong className="text-foreground">{booking.student_name}</strong></p>
              <p className="text-sm text-muted-foreground mb-1">المادة: <strong className="text-foreground">{booking.subject}</strong></p>
              <p className="text-sm text-muted-foreground mb-1">الموعد: <strong className="text-foreground">{booking.lesson_date || "-"} {booking.lesson_time || ""}</strong></p>
              <p className="text-sm text-muted-foreground">الإجمالي: <strong className="text-foreground">{booking.total_amount.toFixed(2)} ر.س</strong></p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <Step icon={<MailCheck className="h-5 w-5" />} text="إرسال بريد إلكتروني بالتأكيد" />
            <Step icon={<BellRing className="h-5 w-5" />} text="إرسال إشعار داخل المنصة" />
            <Step icon={<CalendarPlus className="h-5 w-5" />} text="إضافة الحصة لجدول الطالب والمعلم" />
            <Step icon={<ArrowUpRight className="h-5 w-5" />} text="تذكير تلقائي قبل موعد الحصة" />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <a href={googleCalendarLink} target="_blank" rel="noreferrer">
              <Button variant="outline">إضافة إلى Google Calendar</Button>
            </a>
            <Link to="/dashboard">
              <Button>الذهاب إلى لوحة الطالب</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm text-foreground inline-flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
