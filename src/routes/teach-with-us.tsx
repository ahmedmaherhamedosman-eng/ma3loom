import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { UploadCloud, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/teach-with-us")({
  head: () => ({
    meta: [
      { title: "قدم كمعلم — معلوم" },
      { name: "description", content: "قدّم الآن للانضمام إلى نخبة معلمي منصة معلوم" },
    ],
  }),
  component: TeachWithUsPage,
});

type TeachingType = "live" | "recorded" | "both";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  educationLevel: string;
  university: string;
  graduationYear: string;
  specialization: string;
  teachingSubject: string;
  gradeLevels: string;
  yearsExperience: string;
  bioShort: string;
  bioFull: string;
  introVideoUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  availability: string;
  teachingType: TeachingType;
  termsAccepted: boolean;
}

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  educationLevel: "",
  university: "",
  graduationYear: "",
  specialization: "",
  teachingSubject: "",
  gradeLevels: "",
  yearsExperience: "",
  bioShort: "",
  bioFull: "",
  introVideoUrl: "",
  linkedinUrl: "",
  youtubeUrl: "",
  availability: "",
  teachingType: "both",
  termsAccepted: false,
};

function safeFileName(fileName: string) {
  return fileName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

async function uploadSingleFile(file: File, folder: string) {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from("teacher-applications").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;
  const { data } = supabase.storage.from("teacher-applications").getPublicUrl(path);
  return data.publicUrl;
}

function TeachWithUsPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requiredMissing = useMemo(() => {
    const required = [
      form.fullName,
      form.email,
      form.phone,
      form.country,
      form.city,
      form.educationLevel,
      form.university,
      form.specialization,
      form.teachingSubject,
      form.gradeLevels,
      form.yearsExperience,
    ];

    return required.some((v) => !v.trim());
  }, [form]);

  const onChange = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (requiredMissing) {
      toast.error("يرجى تعبئة الحقول الأساسية قبل الإرسال");
      return;
    }

    if (!form.termsAccepted) {
      toast.error("يجب الموافقة على الشروط والأحكام");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploads: Promise<string>[] = [];
      if (profileImage) uploads.push(uploadSingleFile(profileImage, "profile-images"));
      if (resumeFile) uploads.push(uploadSingleFile(resumeFile, "resumes"));
      const certUploads = certificates.map((file) => uploadSingleFile(file, "certificates"));

      const uploaded = await Promise.all([...uploads, ...certUploads]);

      const profileImageUrl = profileImage ? uploaded[0] : null;
      const resumeUrl = resumeFile ? uploaded[profileImage ? 1 : 0] : null;
      const certStart = (profileImage ? 1 : 0) + (resumeFile ? 1 : 0);
      const certificatesUrls = uploaded.slice(certStart);

      const { error } = await supabase.from("teacher_applications").insert({
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        city: form.city,
        education_level: form.educationLevel,
        university: form.university,
        graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
        specialization: form.specialization,
        teaching_subject: form.teachingSubject,
        grade_levels: form.gradeLevels.split(",").map((x) => x.trim()).filter(Boolean),
        years_experience: Number(form.yearsExperience) || 0,
        bio_short: form.bioShort || null,
        bio_full: form.bioFull || null,
        profile_image_url: profileImageUrl,
        resume_url: resumeUrl,
        certificates_urls: certificatesUrls,
        intro_video_url: form.introVideoUrl || null,
        social_links: {
          linkedin: form.linkedinUrl || null,
          youtube: form.youtubeUrl || null,
        },
        linkedin_url: form.linkedinUrl || null,
        youtube_url: form.youtubeUrl || null,
        availability: form.availability || null,
        teaching_type: form.teachingType,
        terms_accepted: form.termsAccepted,
        status: "pending",
      });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      setForm(initialForm);
      setProfileImage(null);
      setResumeFile(null);
      setCertificates([]);
      toast.success("تم إرسال طلبك بنجاح. سنقوم بمراجعته قريباً.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذّر إرسال الطلب";
      toast.error("تعذّر إرسال الطلب", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl gradient-hero p-8 md:p-12 text-primary-foreground mb-10"
        >
          <div className="absolute -top-16 -start-12 w-56 h-56 rounded-full bg-warm/20 blur-3xl" />
          <div className="absolute -bottom-12 -end-10 w-56 h-56 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 mb-5">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">مسار توظيف المعلمين</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4">قدّم للانضمام إلى نخبة معلمي معلوم</h1>
            <p className="text-primary-foreground/85 text-lg max-w-3xl">
              نبحث عن معلمين محترفين يمتلكون الشغف والخبرة. املأ النموذج التالي وسيتواصل فريقنا معك خلال أقرب وقت.
            </p>
          </div>
        </motion.section>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-border glass p-6 md:p-8 space-y-8">
          <section className="grid md:grid-cols-2 gap-4">
            <Field label="الاسم الكامل*">
              <Input value={form.fullName} onChange={(e) => onChange("fullName", e.target.value)} placeholder="مثال: أحمد محمد" />
            </Field>
            <Field label="البريد الإلكتروني*">
              <Input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} dir="ltr" placeholder="name@example.com" />
            </Field>
            <Field label="رقم الجوال*">
              <Input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} dir="ltr" placeholder="+9665xxxxxxx" />
            </Field>
            <Field label="الدولة*">
              <Input value={form.country} onChange={(e) => onChange("country", e.target.value)} placeholder="السعودية" />
            </Field>
            <Field label="المدينة*">
              <Input value={form.city} onChange={(e) => onChange("city", e.target.value)} placeholder="الرياض" />
            </Field>
            <Field label="المرحلة التعليمية*">
              <Input value={form.educationLevel} onChange={(e) => onChange("educationLevel", e.target.value)} placeholder="بكالوريوس / ماجستير ..." />
            </Field>
            <Field label="الجامعة*">
              <Input value={form.university} onChange={(e) => onChange("university", e.target.value)} placeholder="اسم الجامعة" />
            </Field>
            <Field label="سنة التخرج">
              <Input value={form.graduationYear} onChange={(e) => onChange("graduationYear", e.target.value)} dir="ltr" placeholder="2020" />
            </Field>
            <Field label="التخصص العلمي*">
              <Input value={form.specialization} onChange={(e) => onChange("specialization", e.target.value)} placeholder="رياضيات، لغة عربية، فيزياء..." />
            </Field>
            <Field label="المادة التي تريد تدريسها*">
              <Input value={form.teachingSubject} onChange={(e) => onChange("teachingSubject", e.target.value)} placeholder="رياضيات للمرحلة الثانوية" />
            </Field>
            <Field label="المراحل المستهدفة*">
              <Input value={form.gradeLevels} onChange={(e) => onChange("gradeLevels", e.target.value)} placeholder="ابتدائي, متوسط, ثانوي" />
            </Field>
            <Field label="سنوات الخبرة*">
              <Input value={form.yearsExperience} onChange={(e) => onChange("yearsExperience", e.target.value)} dir="ltr" placeholder="5" />
            </Field>
          </section>

          <section className="grid gap-4">
            <Field label="نبذة قصيرة">
              <Textarea value={form.bioShort} onChange={(e) => onChange("bioShort", e.target.value)} rows={3} placeholder="نبذة تعريفية مختصرة عن خبرتك" />
            </Field>
            <Field label="نبذة تفصيلية">
              <Textarea value={form.bioFull} onChange={(e) => onChange("bioFull", e.target.value)} rows={5} placeholder="اكتب تفاصيل خبراتك وأساليبك التدريسية" />
            </Field>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <Field label="رابط فيديو تعريفي (اختياري)">
              <Input value={form.introVideoUrl} onChange={(e) => onChange("introVideoUrl", e.target.value)} dir="ltr" placeholder="https://..." />
            </Field>
            <Field label="رابط LinkedIn (اختياري)">
              <Input value={form.linkedinUrl} onChange={(e) => onChange("linkedinUrl", e.target.value)} dir="ltr" placeholder="https://linkedin.com/..." />
            </Field>
            <Field label="رابط YouTube (اختياري)">
              <Input value={form.youtubeUrl} onChange={(e) => onChange("youtubeUrl", e.target.value)} dir="ltr" placeholder="https://youtube.com/..." />
            </Field>
            <Field label="الأوقات المتاحة">
              <Input value={form.availability} onChange={(e) => onChange("availability", e.target.value)} placeholder="مثال: الأحد إلى الخميس من 6 إلى 10 مساءً" />
            </Field>
          </section>

          <section>
            <p className="text-sm font-semibold text-foreground mb-3">نمط التدريس المفضل*</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <ChoiceCard active={form.teachingType === "live"} label="حصص مباشرة" onClick={() => onChange("teachingType", "live")} />
              <ChoiceCard active={form.teachingType === "recorded"} label="محتوى مسجل" onClick={() => onChange("teachingType", "recorded")} />
              <ChoiceCard active={form.teachingType === "both"} label="الاثنان معاً" onClick={() => onChange("teachingType", "both")} />
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-4">
            <Field label="صورة شخصية">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
              />
            </Field>
            <Field label="السيرة الذاتية (PDF)">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
            </Field>
            <Field label="الشهادات (متعدد)">
              <Input
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={(e) => setCertificates(Array.from(e.target.files || []))}
              />
            </Field>
          </section>

          <section className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={form.termsAccepted}
                onCheckedChange={(v) => onChange("termsAccepted", Boolean(v))}
              />
              <Label htmlFor="terms" className="leading-7 text-sm text-foreground">
                أقر بأن جميع البيانات صحيحة، وأوافق على مراجعتها من فريق منصة معلوم، وأتحمل مسؤولية المحتوى المقدم.
              </Label>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
              <UploadCloud className="h-4 w-4" />
              يدعم النموذج رفع الملفات وإرسال الروابط مباشرة.
            </p>
            <Button type="submit" size="lg" variant="hero" disabled={isSubmitting}>
              {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </div>

          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-success/30 bg-success/10 p-4 text-success inline-flex items-center gap-2"
            >
              <CheckCircle2 className="h-5 w-5" />
              تم إرسال طلبك بنجاح. سيتم التواصل معك بعد المراجعة.
            </motion.div>
          )}
        </form>
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

function ChoiceCard({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}
