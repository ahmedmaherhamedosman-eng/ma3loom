import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, PlayCircle, Eye, ChevronDown, BookOpen } from "lucide-react";

export interface SidebarChapter {
  id: string;
  title: string;
  lessons: {
    id: string;
    title: string;
    duration_minutes: number | null;
    completed: boolean;
    is_preview?: boolean;
  }[];
}

interface Props {
  courseId: string;
  currentLessonId: string;
  chapters: SidebarChapter[];
  uncategorized: SidebarChapter["lessons"];
  progressPct: number;
  completedCount?: number;
  totalCount?: number;
}

export function LessonSidebar({
  courseId,
  currentLessonId,
  chapters,
  uncategorized,
  progressPct,
  completedCount = 0,
  totalCount = 0,
}: Props) {
  return (
    <div className="h-full overflow-y-auto">
      {/* Header with progress */}
      <div className="p-4 border-b border-border bg-gradient-to-b from-muted/40 to-muted/10 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen size={16} />
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-foreground">محتوى الكورس</h3>
            <p className="text-[10px] text-muted-foreground">
              {completedCount} من {totalCount} درس مكتمل
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>تقدمك</span>
          <span className="font-bold text-primary tabular-nums">{progressPct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full gradient-hero transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <nav className="p-2">
        {uncategorized.length > 0 && (
          <Section
            title="دروس عامة"
            lessons={uncategorized}
            courseId={courseId}
            currentLessonId={currentLessonId}
            defaultOpen
          />
        )}
        {chapters.map((ch) => {
          const hasActive = ch.lessons.some((l) => l.id === currentLessonId);
          return (
            <Section
              key={ch.id}
              title={ch.title}
              lessons={ch.lessons}
              courseId={courseId}
              currentLessonId={currentLessonId}
              defaultOpen={hasActive}
            />
          );
        })}
      </nav>
    </div>
  );
}

function Section({
  title,
  lessons,
  courseId,
  currentLessonId,
  defaultOpen = false,
}: {
  title: string;
  lessons: SidebarChapter["lessons"];
  courseId: string;
  currentLessonId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (lessons.length === 0) return null;

  const completedInSection = lessons.filter((l) => l.completed).length;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-start"
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {completedInSection}/{lessons.length} درس
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="space-y-0.5 mt-1 ms-2 ps-2 border-s border-border/60">
          {lessons.map((l) => {
            const active = l.id === currentLessonId;
            return (
              <li key={l.id}>
                <Link
                  to="/courses/$courseId/lessons/$lessonId"
                  params={{ courseId, lessonId: l.id }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                    active
                      ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                      : "text-foreground/80 hover:bg-muted/60"
                  }`}
                >
                  {active && (
                    <span className="absolute -start-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />
                  )}
                  {l.completed ? (
                    <CheckCircle2 size={16} className="text-success shrink-0" />
                  ) : active ? (
                    <PlayCircle size={16} className="text-primary shrink-0" />
                  ) : (
                    <Circle size={16} className="text-muted-foreground/60 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{l.title}</span>
                  {l.is_preview && (
                    <Eye size={11} className="text-success shrink-0" aria-label="معاينة مجانية" />
                  )}
                  {l.duration_minutes && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {l.duration_minutes}د
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
