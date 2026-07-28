export interface PrivateLessonPackage {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  badge: string | null;
  icon: string | null;
  color_key: string;
  duration_minutes: number;
  sessions_count: number;
  includes_followup: boolean;
  includes_homework: boolean;
  includes_reports: boolean;
  includes_tests: boolean;
  includes_summaries: boolean;
  includes_question_bank: boolean;
  includes_certificate: boolean;
  includes_priority_booking: boolean;
  includes_reschedule: boolean;
  includes_tech_support: boolean;
  feature_list: string[];
  old_price: number | null;
  price: number;
  discount_percent: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  cancellation_policy: string | null;
  refund_policy: string | null;
  seats_remaining: number | null;
  image_url: string | null;
}

export interface PrivateLessonTeacher {
  id: string;
  full_name: string;
  specialization: string;
  teaching_subject: string;
  years_experience: number;
  profile_image_url: string | null;
  bio_short: string | null;
  rating_avg: number;
  rating_count: number;
  students_count: number;
  courses_count: number;
  grade_levels: string[];
  availability: string | null;
  badge: string | null;
  status: string;
}

export const comparisonRows = [
  { key: "sessions", label: "عدد الحصص" },
  { key: "duration", label: "مدة الحصة" },
  { key: "followup", label: "المتابعة" },
  { key: "homework", label: "الواجبات" },
  { key: "reports", label: "التقارير" },
  { key: "tests", label: "الاختبارات" },
  { key: "summaries", label: "الملخصات" },
  { key: "question_bank", label: "بنك الأسئلة" },
  { key: "certificate", label: "الشهادة" },
  { key: "priority", label: "أولوية الحجز" },
  { key: "reschedule", label: "إعادة الجدولة" },
  { key: "support", label: "الدعم الفني" },
  { key: "price", label: "السعر" },
] as const;

export function yesNo(value: boolean) {
  return value ? "✔" : "-";
}

export function packageTheme(colorKey: string) {
  switch (colorKey) {
    case "emerald":
      return {
        ring: "ring-emerald-500/30",
        soft: "from-emerald-500/20 to-emerald-500/5",
        cta: "from-emerald-600 to-emerald-500",
      };
    case "sky":
      return {
        ring: "ring-sky-500/30",
        soft: "from-sky-500/20 to-sky-500/5",
        cta: "from-sky-600 to-sky-500",
      };
    case "violet":
      return {
        ring: "ring-violet-500/30",
        soft: "from-violet-500/20 to-violet-500/5",
        cta: "from-violet-600 to-violet-500",
      };
    case "amber":
      return {
        ring: "ring-amber-500/30",
        soft: "from-amber-500/20 to-amber-500/5",
        cta: "from-amber-600 to-amber-500",
      };
    default:
      return {
        ring: "ring-primary/30",
        soft: "from-primary/20 to-primary/5",
        cta: "from-primary to-primary-glow",
      };
  }
}

export function recommendTeacher(
  teachers: PrivateLessonTeacher[],
  subject: string,
  grade: string,
) {
  if (!teachers.length) return null;

  const normalizedSubject = subject.trim().toLowerCase();
  const normalizedGrade = grade.trim().toLowerCase();

  const scored = teachers.map((teacher) => {
    let score = teacher.rating_avg * 20 + Math.min(teacher.years_experience, 15) * 2;

    if (teacher.teaching_subject.toLowerCase().includes(normalizedSubject)) score += 30;
    if (teacher.specialization.toLowerCase().includes(normalizedSubject)) score += 20;
    if (teacher.grade_levels.join(" ").toLowerCase().includes(normalizedGrade)) score += 15;
    if (teacher.availability) score += 5;

    return { teacher, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.teacher || null;
}
