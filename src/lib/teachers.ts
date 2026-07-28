export interface TeacherProfileRow {
  id: string;
  full_name: string;
  specialization: string;
  teaching_subject: string;
  years_experience: number;
  bio_short: string | null;
  profile_image_url: string | null;
  badge: string | null;
  students_count: number;
  courses_count: number;
  rating_avg: number;
  rating_count: number;
  is_home_visible: boolean;
  display_order: number;
  status: string;
  city: string;
  country: string;
  availability: string | null;
  teaching_type: string;
  linkedin_url: string | null;
  youtube_url: string | null;
  intro_video_url: string | null;
  bio_full: string | null;
}

export interface TeacherReviewRow {
  id: string;
  student_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export const teachingTypeLabel: Record<string, string> = {
  live: "حصص مباشرة",
  recorded: "محتوى مسجل",
  both: "مباشر + مسجل",
};

export const badgeStyles: Record<string, string> = {
  "معلم متميز": "bg-primary/10 text-primary ring-primary/30",
  "الأكثر طلباً": "bg-warm/15 text-warm ring-warm/30",
  "خبير معتمد": "bg-success/10 text-success ring-success/30",
};

export const statusLabel: Record<string, string> = {
  pending: "قيد الانتظار",
  under_review: "تحت المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  needs_changes: "بحاجة لتعديلات",
};
