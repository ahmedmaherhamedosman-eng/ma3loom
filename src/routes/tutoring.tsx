import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Search, Sparkles, GraduationCap, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/tutoring")({
  head: () => ({
    meta: [
      { title: "حصص أونلاين فردية — معلوم" },
      { name: "description", content: "احجز حصة خصوصية أونلاين في أي مادة دراسية أو مهارة. معلمون متخصصون وأوقات مرنة." },
      { property: "og:title", content: "حصص أونلاين فردية — معلوم" },
      { property: "og:description", content: "احجز حصة خصوصية أونلاين مع أفضل المعلمين العرب." },
    ],
  }),
  component: TutoringPage,
});

// All subjects grouped by category — covers most student needs
const SUBJECT_GROUPS: { label: string; icon: string; items: string[] }[] = [
  {
    label: "العلوم الدينية",
    icon: "🕌",
    items: ["تحفيظ القرآن الكريم", "تجويد وتلاوة", "تفسير القرآن", "حديث شريف", "فقه", "عقيدة", "سيرة نبوية"],
  },
  {
    label: "اللغات",
    icon: "🗣️",
    items: ["لغة عربية", "نحو وصرف", "بلاغة وأدب", "إنجليزي", "محادثة إنجليزية", "IELTS / TOEFL", "فرنسي", "ألماني", "تركي", "إسباني"],
  },
  {
    label: "العلوم والرياضيات",
    icon: "🔬",
    items: ["رياضيات", "جبر وهندسة", "حساب مثلثات", "تفاضل وتكامل", "إحصاء", "فيزياء", "كيمياء", "أحياء", "علوم عامة"],
  },
  {
    label: "الدراسات الاجتماعية",
    icon: "🌍",
    items: ["تاريخ", "جغرافيا", "علم نفس", "اجتماع", "فلسفة ومنطق", "اقتصاد"],
  },
  {
    label: "البرمجة والتقنية",
    icon: "💻",
    items: ["مقدمة في البرمجة", "Python", "JavaScript", "تطوير ويب", "تطوير تطبيقات الموبايل", "قواعد البيانات", "ذكاء اصطناعي", "أمن سيبراني"],
  },
  {
    label: "إبداع ومهارات",
    icon: "🎨",
    items: ["تصميم جرافيك", "Photoshop / Illustrator", "تصميم UI/UX", "مونتاج فيديو", "تصوير فوتوغرافي", "كتابة محتوى", "تسويق رقمي"],
  },
  {
    label: "إدارة وأعمال",
    icon: "📊",
    items: ["محاسبة", "إدارة أعمال", "ريادة أعمال", "Excel متقدم", "تحليل بيانات"],
  },
];

function TutoringPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  const navigate = useNavigate();

  const [form, setForm] = useState({
    student_name: "",
    phone: "",
    education_level: "ثانوي",
    preferred_time: "",
    sessions_per_week: 1,
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, education_level")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profile) {
          setForm((f) => ({
            ...f,
            student_name: profile.full_name || "",
            phone: profile.phone || "",
            education_level: profile.education_level || "ثانوي",
          }));
        }
      }
      setLoading(false);
    })();
  }, []);

  const allSubjects = useMemo(
    () => SUBJECT_GROUPS.flatMap((g) => g.items),
    []
  );

  const handleSubmit = async () => {
    if (!user) {
      toast.error("سجّل دخولك أولاً لطلب حصة");
      navigate({ to: "/login" });
      return;
    }
    if (!selectedSubject) return toast.error("اختر المادة من القائمة");
    if (!form.student_name.trim()) return toast.error("الاسم مطلوب");
    if (!form.phone.trim()) return toast.error("رقم التواصل مطلوب");

    setSubmitting(true);

    // Use a single shared "general" specialty row, since the actual subject is in notes
    const { data: existing } = await supabase
      .from("tutoring_specialties")
      .select("id")
      .eq("slug", "general")
      .maybeSingle();

    let specialtyId: string;
    if (existing) {
      specialtyId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("tutoring_specialties")
        .insert({
          name: "حصص عامة",
          slug: "general",
          icon: "🎓",
          description: "طلبات حصص عامة — المادة محددة في الملاحظات",
          price_per_hour: 0,
          sort_order: 0,
          is_active: false,
        })
        .select("id")
        .single();
      if (createErr || !created) {
        setSubmitting(false);
        return toast.error("حصل خطأ، جرّب تاني");
      }
      specialtyId = created.id;
    }

    const finalNotes = `🎯 المادة المطلوبة: ${selectedSubject}${form.notes ? `\n\nملاحظات: ${form.notes}` : ""}`;

    const { error } = await supabase.from("lesson_requests").insert({
      user_id: user.id,
      specialty_id: specialtyId,
      student_name: form.student_name.trim(),
      phone: form.phone.trim(),
      education_level: form.education_level || null,
      preferred_time: form.preferred_time || null,
      sessions_per_week: form.sessions_per_week,
      notes: finalNotes,
    });

    setSubmitting(false);

    if (error) {
      toast.error("حصل خطأ: " + error.message);
    } else {
      toast.success("تم إرسال طلبك بنجاح! هنتواصل معاك قريباً");
      setSelectedSubject("");
      setForm((f) => ({ ...f, preferred_time: "", notes: "", sessions_per_week: 1 }));
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-warm blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-warm" />
            <span className="text-primary-foreground/90 text-sm font-medium">حصص فردية أونلاين بكل المواد</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-5 leading-tight">
            معلم خصوصي <span className="text-warm">لأي مادة</span><br className="hidden md:block" /> في أي وقت
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            من القرآن للبرمجة، ومن الرياضيات للغات. اختر مادتك واحجز حصتك في دقيقة.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-primary-foreground/90">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-warm" />
              <span className="text-sm font-semibold">{allSubjects.length}+ مادة</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-warm" />
              <span className="text-sm font-semibold">معلمون متخصصون</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warm" />
              <span className="text-sm font-semibold">مواعيد مرنة</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main booking section */}
      <section className="py-16 md:py-20 bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border-b border-border">
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
                احجز حصتك الآن
              </h2>
              <p className="text-muted-foreground">
                اختر المادة من القائمة، اكمل بياناتك، وفريقنا هيتواصل معاك خلال ساعات
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {!user && !loading && (
                <div className="bg-warm/10 border border-warm/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-sm text-foreground">سجّل دخولك أو أنشئ حساب لطلب حصة</p>
                  <div className="flex gap-2">
                    <Link to="/login"><Button variant="hero" size="sm">تسجيل الدخول</Button></Link>
                    <Link to="/signup"><Button variant="outline" size="sm">حساب جديد</Button></Link>
                  </div>
                </div>
              )}

              {/* Subject combobox */}
              <div className="space-y-2">
                <Label className="text-base font-bold text-foreground flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  المادة المطلوبة *
                </Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between h-14 text-base bg-background hover:bg-background"
                      disabled={!user}
                    >
                      {selectedSubject ? (
                        <span className="font-semibold text-foreground">{selectedSubject}</span>
                      ) : (
                        <span className="text-muted-foreground">ابحث أو اختر مادة من القائمة...</span>
                      )}
                      <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="ابحث عن مادة..." className="h-11" />
                      <CommandList className="max-h-[320px]">
                        <CommandEmpty>
                          <div className="py-4 text-center text-sm">
                            <p className="text-muted-foreground mb-2">لم نجد المادة</p>
                            <p className="text-xs text-muted-foreground">جرّب اسم مختلف، أو اختر مادة قريبة واكتب التفاصيل في الملاحظات</p>
                          </div>
                        </CommandEmpty>
                        {SUBJECT_GROUPS.map((group) => (
                          <CommandGroup
                            key={group.label}
                            heading={
                              <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                                <span>{group.icon}</span>
                                {group.label}
                              </span>
                            }
                          >
                            {group.items.map((subject) => (
                              <CommandItem
                                key={subject}
                                value={subject}
                                onSelect={(val) => {
                                  setSelectedSubject(val === selectedSubject ? "" : subject);
                                  setOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "ms-2 h-4 w-4",
                                    selectedSubject === subject ? "opacity-100 text-primary" : "opacity-0"
                                  )}
                                />
                                {subject}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedSubject && (
                  <p className="text-xs text-primary font-medium pt-1">
                    ✓ تم اختيار: {selectedSubject}
                  </p>
                )}
              </div>

              {/* Form fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>اسم الطالب *</Label>
                  <Input
                    value={form.student_name}
                    onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                    placeholder="الاسم الكامل"
                    disabled={!user}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم التواصل (واتساب) *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    disabled={!user}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المرحلة الدراسية</Label>
                  <select
                    value={form.education_level}
                    onChange={(e) => setForm({ ...form, education_level: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    disabled={!user}
                  >
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="متوسط">متوسط</option>
                    <option value="ثانوي">ثانوي</option>
                    <option value="جامعي">جامعي</option>
                    <option value="عام">عام / غير محدد</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>الوقت المفضل</Label>
                  <Input
                    value={form.preferred_time}
                    onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                    placeholder="مثال: المساء بعد ٧ م"
                    disabled={!user}
                  />
                </div>
                <div className="space-y-2">
                  <Label>عدد الحصص أسبوعياً</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={form.sessions_per_week}
                    onChange={(e) => setForm({ ...form, sessions_per_week: Number(e.target.value) })}
                    disabled={!user}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>ملاحظات إضافية</Label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="أي تفاصيل تحب نعرفها (المستوى الحالي، الأهداف، أي ملاحظات...)"
                    className="flex w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    disabled={!user}
                  />
                </div>
              </div>

              <Button
                variant="hero"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || !user}
                className="w-full h-14 text-base"
              >
                {submitting ? "جاري الإرسال..." : "📨 أرسل طلب الحصة"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                السعر يتحدد حسب المادة والمرحلة، وهنتواصل معاك للاتفاق على التفاصيل
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-10 text-center">
            كيف تتم الحصة؟
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: "📝", title: "اطلب حصة", desc: "اختر المادة واملأ بياناتك في دقيقة" },
              { icon: "📞", title: "نتواصل معك", desc: "نرشح لك المعلم المناسب ونتفق على الموعد والسعر" },
              { icon: "🎓", title: "ابدأ التعلم", desc: "احضر حصتك أونلاين عبر زوم أو جوجل ميت" },
            ].map((step, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-6 text-center card-hover">
                <div className="text-5xl mb-3">{step.icon}</div>
                <h3 className="font-bold text-foreground mb-2">{i + 1}. {step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
