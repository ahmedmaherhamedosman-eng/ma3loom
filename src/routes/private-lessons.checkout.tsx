import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { PrivateLessonPackage, PrivateLessonTeacher } from "@/lib/private-lessons";

export const Route = createFileRoute("/private-lessons/checkout")({
  head: () => ({ meta: [{ title: "تأكيد الحجز — معلوم" }] }),
  component: PrivateLessonsCheckout,
});

function PrivateLessonsCheckout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [packageRow, setPackageRow] = useState<PrivateLessonPackage | null>(null);
  const [teacher, setTeacher] = useState<PrivateLessonTeacher | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [educationLevel, setEducationLevel] = useState("ثانوي");
  const [subject, setSubject] = useState("رياضيات");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [coupon, setCoupon] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const packageId = searchParams.get("packageId") || "";
  const teacherId = searchParams.get("teacherId") || "";
  const initialSubject = searchParams.get("subject") || "";
  const initialDate = searchParams.get("date") || "";
  const initialTime = searchParams.get("time") || "";

  useEffect(() => {
    if (initialSubject) setSubject(initialSubject);
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
  }, [initialDate, initialSubject, initialTime]);

  useEffect(() => {
    const load = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const session = sessionRes.session;
      if (!session) {
        navigate({ to: "/login" });
        return;
      }

      const [profileRes, pkgRes, teacherRes, fallbackPkgRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, education_level").eq("user_id", session.user.id).maybeSingle(),
        packageId
          ? supabase
              .from("private_lesson_packages")
              .select("id,name,slug,short_description,full_description,badge,icon,color_key,duration_minutes,sessions_count,includes_followup,includes_homework,includes_reports,includes_tests,includes_summaries,includes_question_bank,includes_certificate,includes_priority_booking,includes_reschedule,includes_tech_support,feature_list,old_price,price,discount_percent,is_featured,sort_order,cancellation_policy,refund_policy,seats_remaining,image_url")
              .eq("id", packageId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        teacherId
          ? supabase
              .from("teacher_applications")
              .select("id,full_name,specialization,teaching_subject,years_experience,profile_image_url,bio_short,rating_avg,rating_count,students_count,courses_count,grade_levels,availability,badge,status")
              .eq("id", teacherId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("private_lesson_packages")
          .select("id,name,slug,short_description,full_description,badge,icon,color_key,duration_minutes,sessions_count,includes_followup,includes_homework,includes_reports,includes_tests,includes_summaries,includes_question_bank,includes_certificate,includes_priority_booking,includes_reschedule,includes_tech_support,feature_list,old_price,price,discount_percent,is_featured,sort_order,cancellation_policy,refund_policy,seats_remaining,image_url")
          .eq("slug", "single-session")
          .maybeSingle(),
      ]);

      setStudentName(profileRes.data?.full_name || session.user.email?.split("@")[0] || "");
      setStudentPhone(profileRes.data?.phone || "");
      setEducationLevel(profileRes.data?.education_level || "ثانوي");
      setPackageRow((pkgRes.data as PrivateLessonPackage | null) || (fallbackPkgRes.data as PrivateLessonPackage | null));
      setTeacher((teacherRes.data as PrivateLessonTeacher | null) || null);
      setLoading(false);
    };

    void load();
  }, [navigate, packageId, teacherId]);

  const priceSummary = useMemo(() => {
    const price = packageRow?.price || 0;
    const couponDiscount = coupon.trim().toUpperCase() === "MALOOM10" ? price * 0.1 : 0;
    const subtotal = price - couponDiscount;
    const tax = subtotal * 0.15;
    const total = subtotal + tax;
    return { price, couponDiscount, tax, total, subtotal };
  }, [coupon, packageRow?.price]);

  const handleConfirm = async () => {
    if (!packageRow) return;
    if (!subject.trim() || !studentName.trim() || !studentPhone.trim() || !date || !time) {
      toast.error("يرجى إكمال جميع الحقول المطلوبة");
      return;
    }

    const { data: sessionRes } = await supabase.auth.getSession();
    const session = sessionRes.session;
    if (!session) {
      toast.error("يرجى تسجيل الدخول أولاً");
      navigate({ to: "/login" });
      return;
    }

    setIsSaving(true);

    const { data: booking, error } = await supabase
      .from("private_lesson_bookings")
      .insert({
        user_id: session.user.id,
        package_id: packageRow.id,
        teacher_application_id: teacher?.id || null,
        instructor_user_id: null,
        student_name: studentName,
        student_email: session.user.email || null,
        student_phone: studentPhone,
        subject,
        education_level: educationLevel,
        lesson_date: date,
        lesson_time: time,
        sessions_count: packageRow.sessions_count,
        duration_minutes: packageRow.duration_minutes,
        seats_left_snapshot: packageRow.seats_remaining,
        subtotal: Number(priceSummary.subtotal.toFixed(2)),
        discount_amount: Number(priceSummary.couponDiscount.toFixed(2)),
        tax_amount: Number(priceSummary.tax.toFixed(2)),
        total_amount: Number(priceSummary.total.toFixed(2)),
        coupon_code: coupon || null,
        payment_status: "pending",
        booking_status: "pending",
      })
      .select("id")
      .single();

    if (error || !booking) {
      setIsSaving(false);
      toast.error("تعذّر تأكيد الحجز", { description: error?.message || "حاول مرة أخرى" });
      return;
    }

    // Simulate successful payment flow for now and trigger post-payment actions.
    await supabase
      .from("private_lesson_bookings")
      .update({ payment_status: "paid", booking_status: "confirmed" })
      .eq("id", booking.id);

    await supabase.from("user_notifications").insert({
      user_id: session.user.id,
      title: "تم تأكيد حجز الحصة الخصوصية",
      message: `تم تأكيد حجزك في باقة ${packageRow.name} يوم ${date} الساعة ${time}.`,
      link: "/dashboard",
    });

    setIsSaving(false);
    navigate({ to: "/private-lessons/success", search: { bookingId: booking.id } });
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">جاري تجهيز بيانات الحجز...</div>;
  }

  if (!packageRow) {
    return <div className="py-20 text-center text-muted-foreground">لم يتم العثور على الباقة.</div>;
  }

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-foreground mb-2">مراجعة الحجز</h1>
        <p className="text-muted-foreground mb-6">تأكد من التفاصيل ثم اضغط تأكيد الحجز والدفع</p>

        <div className="rounded-3xl border border-border bg-card p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="اسم الطالب">
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            </Field>
            <Field label="الجوال">
              <Input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} dir="ltr" />
            </Field>
            <Field label="المادة">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="المرحلة">
              <Input value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} />
            </Field>
            <Field label="التاريخ">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="الوقت">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground mb-2">نوع الباقة</p>
            <p className="text-xl font-bold text-foreground">{packageRow.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {packageRow.sessions_count} حصص • {packageRow.duration_minutes} دقيقة لكل حصة
            </p>
            {teacher && (
              <p className="text-sm text-muted-foreground mt-2">المعلم: {teacher.full_name}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="كوبون الخصم">
              <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="مثال: MALOOM10" dir="ltr" />
            </Field>
            <div className="rounded-xl border border-border bg-background p-3 text-sm">
              <p className="flex justify-between"><span>السعر</span><strong>{priceSummary.price.toFixed(2)} ر.س</strong></p>
              <p className="flex justify-between text-success"><span>الخصم</span><strong>-{priceSummary.couponDiscount.toFixed(2)} ر.س</strong></p>
              <p className="flex justify-between"><span>الضريبة</span><strong>{priceSummary.tax.toFixed(2)} ر.س</strong></p>
              <p className="mt-2 pt-2 border-t border-border flex justify-between text-base font-bold"><span>الإجمالي</span><strong>{priceSummary.total.toFixed(2)} ر.س</strong></p>
            </div>
          </div>

          <Button onClick={handleConfirm} size="lg" className="w-full" disabled={isSaving}>
            {isSaving ? "جاري التأكيد..." : "تأكيد الحجز والدفع"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
