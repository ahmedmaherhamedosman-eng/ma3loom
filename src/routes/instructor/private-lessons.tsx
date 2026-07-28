import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/instructor/private-lessons")({
  head: () => ({ meta: [{ title: "إدارة الحصص — لوحة المدرس" }] }),
  component: InstructorPrivateLessonsPage,
});

interface BookingRow {
  id: string;
  student_name: string;
  subject: string;
  lesson_date: string | null;
  lesson_time: string | null;
  booking_status: string;
  payment_status: string;
  meeting_link: string | null;
  homework_url: string | null;
  teacher_notes: string | null;
}

interface AvailabilityRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function InstructorPrivateLessonsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [teacherAppId, setTeacherAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({ day: 0, start: "17:00", end: "20:00" });

  const load = async () => {
    setLoading(true);
    const { data: sessionRes } = await supabase.auth.getSession();
    const session = sessionRes.session;
    if (!session) {
      setLoading(false);
      return;
    }

    const { data: app } = await supabase
      .from("teacher_applications")
      .select("id")
      .eq("instructor_user_id", session.user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!app?.id) {
      setTeacherAppId(null);
      setBookings([]);
      setAvailability([]);
      setLoading(false);
      return;
    }

    setTeacherAppId(app.id);

    const [bookingsRes, availabilityRes] = await Promise.all([
      supabase
        .from("private_lesson_bookings")
        .select("id,student_name,subject,lesson_date,lesson_time,booking_status,payment_status,meeting_link,homework_url,teacher_notes")
        .eq("teacher_application_id", app.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("instructor_availability")
        .select("id,day_of_week,start_time,end_time,is_active")
        .eq("teacher_application_id", app.id)
        .order("day_of_week", { ascending: true }),
    ]);

    setBookings((bookingsRes.data as BookingRow[] | null) || []);
    setAvailability((availabilityRes.data as AvailabilityRow[] | null) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const addAvailability = async () => {
    if (!teacherAppId) return;
    const { error } = await supabase.from("instructor_availability").insert({
      teacher_application_id: teacherAppId,
      day_of_week: newSlot.day,
      start_time: newSlot.start,
      end_time: newSlot.end,
      is_active: true,
    });

    if (error) {
      toast.error("تعذر إضافة وقت التفرغ", { description: error.message });
      return;
    }

    toast.success("تمت إضافة وقت التفرغ");
    void load();
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("private_lesson_bookings").update({ booking_status: status }).eq("id", id);
    if (error) toast.error("تعذر تحديث الحجز", { description: error.message });
    else {
      toast.success("تم تحديث حالة الحجز");
      void load();
    }
  };

  const saveBookingExtra = async (id: string, meetingLink: string | null, homeworkUrl: string | null, teacherNotes: string | null) => {
    const { error } = await supabase
      .from("private_lesson_bookings")
      .update({ meeting_link: meetingLink, homework_url: homeworkUrl, teacher_notes: teacherNotes })
      .eq("id", id);

    if (error) toast.error("تعذر حفظ البيانات", { description: error.message });
    else toast.success("تم حفظ التحديثات");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة الحصص</h1>
        <p className="text-sm text-muted-foreground mt-1">جدول الحصص، قبول الحجوزات، إدارة التفرغ والملفات</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold text-foreground mb-3">تحديد أوقات التفرغ</h2>
        {!teacherAppId ? (
          <p className="text-sm text-muted-foreground">لا يوجد ملف معلم مرتبط بحسابك حتى الآن.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-4 gap-3 mb-4">
              <select value={newSlot.day} onChange={(e) => setNewSlot((p) => ({ ...p, day: Number(e.target.value) }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {dayNames.map((day, i) => <option key={day} value={i}>{day}</option>)}
              </select>
              <Input type="time" value={newSlot.start} onChange={(e) => setNewSlot((p) => ({ ...p, start: e.target.value }))} />
              <Input type="time" value={newSlot.end} onChange={(e) => setNewSlot((p) => ({ ...p, end: e.target.value }))} />
              <Button onClick={addAvailability}>إضافة</Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {availability.map((slot) => (
                <div key={slot.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-semibold text-foreground">{dayNames[slot.day_of_week]}</p>
                  <p className="text-muted-foreground" dir="ltr">{slot.start_time} - {slot.end_time}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold text-foreground mb-3">جدول الحجوزات</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد حجوزات حالياً.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onUpdateStatus={updateBookingStatus} onSaveExtra={saveBookingExtra} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookingCard({
  booking,
  onUpdateStatus,
  onSaveExtra,
}: {
  booking: BookingRow;
  onUpdateStatus: (id: string, status: string) => void;
  onSaveExtra: (id: string, meetingLink: string | null, homeworkUrl: string | null, teacherNotes: string | null) => void;
}) {
  const [meetingLink, setMeetingLink] = useState(booking.meeting_link || "");
  const [homeworkUrl, setHomeworkUrl] = useState(booking.homework_url || "");
  const [teacherNotes, setTeacherNotes] = useState(booking.teacher_notes || "");

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="font-semibold text-foreground">{booking.student_name} - {booking.subject}</p>
        <select value={booking.booking_status} onChange={(e) => onUpdateStatus(booking.id, e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
          <option value="pending">قيد الانتظار</option>
          <option value="confirmed">مؤكد</option>
          <option value="cancelled">ملغي</option>
          <option value="completed">منتهي</option>
          <option value="rescheduled">مجدول</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{booking.lesson_date || "-"} {booking.lesson_time || ""} • الدفع: {booking.payment_status}</p>

      <div className="grid sm:grid-cols-2 gap-2 mb-2">
        <Field label="رابط الحصة">
          <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://..." dir="ltr" />
        </Field>
        <Field label="ملف الواجب">
          <Input value={homeworkUrl} onChange={(e) => setHomeworkUrl(e.target.value)} placeholder="https://..." dir="ltr" />
        </Field>
      </div>
      <Field label="ملاحظات عن الطالب">
        <Input value={teacherNotes} onChange={(e) => setTeacherNotes(e.target.value)} />
      </Field>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSaveExtra(booking.id, meetingLink || null, homeworkUrl || null, teacherNotes || null)}>
          حفظ
        </Button>
        <Button size="sm" variant="outline">إنشاء واجب</Button>
        <Button size="sm" variant="outline">إنشاء اختبار</Button>
        <Button size="sm" variant="outline">تقييم الطالب</Button>
        <Button size="sm" variant="outline">متابعة الأرباح</Button>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
