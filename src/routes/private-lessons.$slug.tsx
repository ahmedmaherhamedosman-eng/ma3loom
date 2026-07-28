import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock3, HelpCircle, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { packageTheme, type PrivateLessonPackage, type PrivateLessonTeacher } from "@/lib/private-lessons";

export const Route = createFileRoute("/private-lessons/$slug")({
  head: () => ({ meta: [{ title: "تفاصيل الباقة — معلوم" }] }),
  component: PrivateLessonPackageDetails,
});

function PrivateLessonPackageDetails() {
  const { slug } = Route.useParams();
  const [pkg, setPkg] = useState<PrivateLessonPackage | null>(null);
  const [teachers, setTeachers] = useState<PrivateLessonTeacher[]>([]);
  const [subject, setSubject] = useState("رياضيات");
  const [teacherId, setTeacherId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [pkgRes, teachersRes] = await Promise.all([
        supabase
          .from("private_lesson_packages")
          .select("id,name,slug,short_description,full_description,badge,icon,color_key,duration_minutes,sessions_count,includes_followup,includes_homework,includes_reports,includes_tests,includes_summaries,includes_question_bank,includes_certificate,includes_priority_booking,includes_reschedule,includes_tech_support,feature_list,old_price,price,discount_percent,is_featured,sort_order,cancellation_policy,refund_policy,seats_remaining,image_url")
          .eq("slug", slug)
          .eq("is_active", true)
          .single(),
        supabase
          .from("teacher_applications")
          .select("id,full_name,specialization,teaching_subject,years_experience,profile_image_url,bio_short,rating_avg,rating_count,students_count,courses_count,grade_levels,availability,badge,status")
          .eq("status", "accepted")
          .order("rating_avg", { ascending: false })
          .limit(10),
      ]);

      setPkg((pkgRes.data as PrivateLessonPackage | null) || null);
      const teacherRows = (teachersRes.data as PrivateLessonTeacher[] | null) || [];
      setTeachers(teacherRows);
      if (teacherRows.length) setTeacherId(teacherRows[0].id);
      setLoading(false);
    };

    void load();
  }, [slug]);

  const theme = useMemo(() => packageTheme(pkg?.color_key || "primary"), [pkg?.color_key]);

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">جاري تحميل تفاصيل الباقة...</div>;
  }

  if (!pkg) {
    return <div className="py-20 text-center text-muted-foreground">الباقة غير متاحة حالياً.</div>;
  }

  const checkoutHref = `/private-lessons/checkout?packageId=${pkg.id}&subject=${encodeURIComponent(subject)}&teacherId=${teacherId}&date=${date}&time=${time}`;

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className={`rounded-2xl bg-gradient-to-l ${theme.soft} p-5 mb-5`}>
              <p className="text-4xl mb-2">{pkg.icon || "📦"}</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">{pkg.name}</h1>
              <p className="text-muted-foreground">{pkg.full_description || pkg.short_description}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-5 text-sm">
              <Meta icon={<Clock3 className="h-4 w-4" />} text={`مدة الحصة: ${pkg.duration_minutes} دقيقة`} />
              <Meta icon={<Users className="h-4 w-4" />} text={`عدد الحصص: ${pkg.sessions_count}`} />
              <Meta icon={<Star className="h-4 w-4" />} text={`التوفير: ${pkg.discount_percent}%`} />
              <Meta icon={<CalendarDays className="h-4 w-4" />} text={`المقاعد المتبقية: ${pkg.seats_remaining ?? "غير محدود"}`} />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-3">المميزات</h2>
            <ul className="space-y-2 mb-6">
              {pkg.feature_list.map((feature) => (
                <li key={feature} className="text-sm text-foreground inline-flex items-center gap-2">✔ {feature}</li>
              ))}
            </ul>

            <h2 className="text-xl font-bold text-foreground mb-3">تقييمات الطلاب</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {[
                "شرح ممتاز وواضح جداً.",
                "تنظيم الحصص رائع والمتابعة فعالة.",
                "البرنامج ساعدني في رفع المعدل.",
                "الدعم الفني سريع جدًا عند أي مشكلة.",
              ].map((txt) => (
                <div key={txt} className="rounded-xl border border-border p-3 text-sm text-muted-foreground">{txt}</div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-foreground mb-3">الأسئلة الشائعة</h2>
            <div className="space-y-2 mb-6">
              {[
                "كيف أحجز حصة؟",
                "هل يمكن تغيير الموعد؟",
                "هل أستطيع استرداد الرسوم؟",
                "هل الحصص مسجلة؟",
              ].map((q) => (
                <div key={q} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-semibold text-foreground inline-flex items-center gap-2"><HelpCircle className="h-4 w-4 text-primary" />{q}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="font-semibold text-foreground mb-2">سياسة الإلغاء والاسترجاع</p>
              <p className="text-muted-foreground">{pkg.cancellation_policy || "يمكن إعادة الجدولة قبل الموعد وفق شروط الباقة."}</p>
              <p className="text-muted-foreground mt-2">{pkg.refund_policy || "تتم مراجعة طلب الاسترجاع خلال 48 ساعة."}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 h-fit sticky top-20">
            <h2 className="text-xl font-bold text-foreground mb-4">احجز هذه الباقة</h2>

            <div className="space-y-3">
              <Field label="اختيار المادة">
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
              <Field label="اختيار المعلم">
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name} - {teacher.teaching_subject}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="اختيار التاريخ">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="اختيار الوقت">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>

            <div className="rounded-xl bg-muted/40 border border-border p-3 my-4">
              <p className="text-xs text-muted-foreground">السعر</p>
              <p className="text-3xl font-extrabold text-foreground">{pkg.price} <span className="text-sm">ر.س</span></p>
            </div>

            <a href={checkoutHref}>
              <Button size="lg" className={`w-full bg-gradient-to-l ${theme.cta} text-white`}>احجز الآن</Button>
            </a>

            <Link to="/private-lessons" className="mt-3 block text-center text-sm text-primary hover:underline">العودة إلى جميع الباقات</Link>
          </section>
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

function Meta({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground inline-flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
