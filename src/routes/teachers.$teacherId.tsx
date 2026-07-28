import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Star, Users, BookOpen, MapPin, Clock3, GraduationCap, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { badgeStyles, teachingTypeLabel, type TeacherProfileRow, type TeacherReviewRow } from "@/lib/teachers";

export const Route = createFileRoute("/teachers/$teacherId")({
  head: () => ({
    meta: [
      { title: "ملف المعلم — معلوم" },
      { name: "description", content: "تعرف على خبرات ومؤهلات معلمي منصة معلوم" },
    ],
  }),
  component: TeacherProfilePage,
});

function TeacherProfilePage() {
  const { teacherId } = Route.useParams();
  const [teacher, setTeacher] = useState<TeacherProfileRow | null>(null);
  const [reviews, setReviews] = useState<TeacherReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [teacherRes, reviewsRes] = await Promise.all([
        supabase
          .from("teacher_applications")
          .select("id,full_name,specialization,teaching_subject,years_experience,bio_short,profile_image_url,badge,students_count,courses_count,rating_avg,rating_count,is_home_visible,display_order,status,city,country,availability,teaching_type,linkedin_url,youtube_url,intro_video_url,bio_full")
          .eq("id", teacherId)
          .eq("status", "accepted")
          .single(),
        supabase
          .from("teacher_reviews")
          .select("id,student_name,rating,comment,created_at")
          .eq("teacher_application_id", teacherId)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (teacherRes.data) setTeacher(teacherRes.data as TeacherProfileRow);
      setReviews((reviewsRes.data as TeacherReviewRow[] | null) || []);
      setLoading(false);
    };

    load();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">جاري تحميل ملف المعلم...</div>
    );
  }

  if (!teacher) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">المعلم غير موجود</h1>
        <Link to="/">
          <Button variant="hero">العودة للرئيسية</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="rounded-3xl border border-border/70 glass p-6 md:p-8 mb-8"
        >
          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {teacher.badge && (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${badgeStyles[teacher.badge] || "bg-muted text-foreground"}`}>
                    {teacher.badge}
                  </span>
                )}
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{teacher.specialization}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-2">{teacher.full_name}</h1>
              <p className="text-lg text-muted-foreground mb-5">{teacher.teaching_subject}</p>

              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                <InfoItem icon={<MapPin className="h-4 w-4" />} label="الموقع" value={`${teacher.city}، ${teacher.country}`} />
                <InfoItem icon={<Clock3 className="h-4 w-4" />} label="الإتاحة" value={teacher.availability || "حسب التنسيق"} />
                <InfoItem icon={<GraduationCap className="h-4 w-4" />} label="الخبرة" value={`${teacher.years_experience} سنوات`} />
                <InfoItem icon={<PlayCircle className="h-4 w-4" />} label="نمط التعليم" value={teachingTypeLabel[teacher.teaching_type] || "غير محدد"} />
              </div>

              {teacher.bio_full && <p className="text-foreground/90 leading-8">{teacher.bio_full}</p>}
            </div>

            <div className="rounded-3xl bg-card/90 border border-border p-4 shadow-elevated">
              <img src={teacher.profile_image_url || "/placeholder.svg"} alt={teacher.full_name} className="w-full h-72 object-cover rounded-2xl" />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <StatCard icon={<Users className="h-4 w-4" />} label="طلاب" value={teacher.students_count.toLocaleString("ar-EG")} />
                <StatCard icon={<BookOpen className="h-4 w-4" />} label="دورات" value={`${teacher.courses_count}`} />
                <StatCard icon={<Star className="h-4 w-4" />} label="تقييم" value={teacher.rating_avg.toFixed(1)} />
              </div>
              <div className="mt-4 flex gap-2">
                {teacher.linkedin_url && (
                  <a href={teacher.linkedin_url} target="_blank" rel="noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full">LinkedIn</Button>
                  </a>
                )}
                {teacher.youtube_url && (
                  <a href={teacher.youtube_url} target="_blank" rel="noreferrer" className="flex-1">
                    <Button variant="outline" className="w-full">YouTube</Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {reviews.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-2xl font-extrabold text-foreground mb-5">آراء الطلاب</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-foreground">{review.student_name}</p>
                    <p className="text-warm text-sm">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </p>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground leading-7">{review.comment}</p>}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/35 border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mb-1">{icon}{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/35 border border-border px-2 py-2">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
