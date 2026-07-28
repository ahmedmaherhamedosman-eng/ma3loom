import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star, Users, BookOpen, Sparkles, BriefcaseBusiness, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { badgeStyles, type TeacherProfileRow } from "@/lib/teachers";

interface EliteTeachersSectionProps {
  teachers: TeacherProfileRow[];
}

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function EliteTeachersSection({ teachers }: EliteTeachersSectionProps) {
  if (teachers.length === 0) return null;

  return (
    <section className="relative py-20 lg:py-28 overflow-hidden">
      <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -end-24 w-80 h-80 rounded-full bg-warm/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={reveal}
          transition={{ duration: 0.55 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-bold">نخبة معلمي منصة معلوم</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-4">
            معلمون يصنعون فارقاً حقيقياً
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            خبراء في التعليم الرقمي يقدمون تجربة تعلم مخصصة، نتائج ملموسة، ومتابعة دقيقة لكل طالب.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.08 }}
          className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {teachers.map((teacher) => (
            <motion.article
              key={teacher.id}
              variants={reveal}
              transition={{ duration: 0.45 }}
              className="group rounded-3xl border border-border/70 glass p-6 shadow-elegant hover:shadow-glow transition-all"
            >
              <div className="flex items-start gap-4">
                <img
                  src={teacher.profile_image_url || "/placeholder.svg"}
                  alt={teacher.full_name}
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/20"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-foreground mb-1 line-clamp-1">{teacher.full_name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {teacher.specialization} • {teacher.teaching_subject}
                  </p>
                  {teacher.badge && (
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeStyles[teacher.badge] || "bg-muted text-foreground"}`}>
                      {teacher.badge}
                    </span>
                  )}
                </div>
              </div>

              {teacher.bio_short && (
                <p className="mt-4 text-sm text-muted-foreground leading-7 line-clamp-3">{teacher.bio_short}</p>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-muted/60 px-2 py-2">
                  <div className="flex justify-center mb-1 text-primary"><Users className="h-4 w-4" /></div>
                  <p className="text-xs text-muted-foreground">طلاب</p>
                  <p className="text-sm font-bold text-foreground">{teacher.students_count.toLocaleString("ar-EG")}</p>
                </div>
                <div className="rounded-xl bg-muted/60 px-2 py-2">
                  <div className="flex justify-center mb-1 text-primary"><BookOpen className="h-4 w-4" /></div>
                  <p className="text-xs text-muted-foreground">دورات</p>
                  <p className="text-sm font-bold text-foreground">{teacher.courses_count}</p>
                </div>
                <div className="rounded-xl bg-muted/60 px-2 py-2">
                  <div className="flex justify-center mb-1 text-warm"><Star className="h-4 w-4" /></div>
                  <p className="text-xs text-muted-foreground">التقييم</p>
                  <p className="text-sm font-bold text-foreground">{teacher.rating_avg.toFixed(1)}</p>
                </div>
              </div>

              <Link
                to="/teachers/$teacherId"
                params={{ teacherId: teacher.id }}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl gradient-brand px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-elevated"
              >
                عرض الملف الكامل
              </Link>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mt-16 rounded-3xl border border-border/70 glass p-8 text-center"
        >
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <BriefcaseBusiness className="h-5 w-5" />
            <span className="font-bold">انضم إلى فريق منصة معلوم</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">هل أنت معلم شغوف بالتأثير؟</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            نبحث عن معلمين مميزين في مختلف التخصصات لتقديم تجربة تعليمية استثنائية لطلابنا في العالم العربي.
          </p>
          <Link to="/teach-with-us">
            <Button variant="hero" size="xl" className="group min-w-56">
              قدم الآن
              <ArrowLeft className="ms-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
