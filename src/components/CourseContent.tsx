import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Lock, PlayCircle, CheckCircle2, Eye } from "lucide-react";

export interface ChapterWithLessons {
  id: string;
  title: string;
  lessons: {
    id: string;
    title: string;
    duration_minutes: number | null;
    is_preview?: boolean;
    completed?: boolean;
  }[];
}

interface Props {
  courseId: string;
  chapters: ChapterWithLessons[];
  canAccess: boolean;
}

export function CourseContent({ courseId, chapters, canAccess }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(chapters.map((c, i) => [c.id, i === 0]))
  );

  if (chapters.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        لا توجد دروس متاحة حالياً
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chapters.map((ch, idx) => {
        const isOpen = open[ch.id] ?? false;
        const totalMin = ch.lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0);
        return (
          <div key={ch.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setOpen({ ...open, [ch.id]: !isOpen })}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 text-start">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{ch.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {ch.lessons.length} درس{totalMin > 0 ? ` · ${totalMin} دقيقة` : ""}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-border">
                {ch.lessons.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground text-center">لا توجد دروس في هذا القسم</p>
                ) : (
                  ch.lessons.map((l, i) => {
                    // Each lesson is accessible if the user can access the whole course OR it is a preview lesson
                    const lessonAccessible = canAccess || !!l.is_preview;
                    const inner = (
                      <div className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                        <span className="w-6 text-xs text-muted-foreground text-center">{i + 1}</span>
                        {l.completed ? (
                          <CheckCircle2 size={16} className="text-success shrink-0" />
                        ) : lessonAccessible ? (
                          <PlayCircle size={16} className="text-primary shrink-0" />
                        ) : (
                          <Lock size={14} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 text-sm text-foreground truncate">{l.title}</span>
                        {l.is_preview && !canAccess && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-success/15 text-success px-2 py-0.5 rounded-full shrink-0">
                            <Eye size={10} /> معاينة
                          </span>
                        )}
                        {l.duration_minutes && (
                          <span className="text-xs text-muted-foreground">{l.duration_minutes} د</span>
                        )}
                      </div>
                    );
                    return lessonAccessible ? (
                      <Link
                        key={l.id}
                        to="/courses/$courseId/lessons/$lessonId"
                        params={{ courseId, lessonId: l.id }}
                        className="block"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={l.id} className="opacity-70">{inner}</div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
