import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VideoUpload } from "@/components/VideoUpload";
import { LessonResourcesDialog } from "@/components/admin/LessonResourcesDialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/admin/lessons/$courseId")({
  component: AdminLessons,
});

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  description: string | null;
  content: string | null;
  sort_order: number;
  lesson_type: string;
  is_published: boolean;
  is_preview: boolean;
  chapter_id: string | null;
}

interface Chapter {
  id: string;
  title: string;
  sort_order: number;
}

const UNASSIGNED = "__unassigned__";

function AdminLessons() {
  const { courseId } = Route.useParams();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [courseName, setCourseName] = useState("");
  const [loading, setLoading] = useState(true);

  // chapter form
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState({ title: "" });

  // lesson form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    video_url: "",
    description: "",
    content: "",
    sort_order: 0,
    lesson_type: "regular",
    is_published: false,
    is_preview: false,
    chapter_id: "" as string | "",
  });

  // resources dialog
  const [resourcesLessonId, setResourcesLessonId] = useState<string | null>(null);
  const [resourcesLessonTitle, setResourcesLessonTitle] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: course }, { data: lessonsData }, { data: chaptersData }] = await Promise.all([
      supabase.from("courses").select("title").eq("id", courseId).single(),
      supabase.from("lessons").select("*").eq("course_id", courseId).order("sort_order"),
      supabase.from("chapters").select("*").eq("course_id", courseId).order("sort_order"),
    ]);
    setCourseName(course?.title || "");
    setLessons(lessonsData || []);
    setChapters(chaptersData || []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- Chapter CRUD ----------
  const resetChapterForm = () => {
    setChapterForm({ title: "" });
    setEditingChapterId(null);
    setShowChapterForm(false);
  };

  const handleSaveChapter = async () => {
    if (!chapterForm.title.trim()) return;
    if (editingChapterId) {
      await supabase.from("chapters").update({ title: chapterForm.title }).eq("id", editingChapterId);
    } else {
      await supabase.from("chapters").insert({
        course_id: courseId,
        title: chapterForm.title,
        sort_order: chapters.length + 1,
      });
    }
    resetChapterForm();
    loadData();
  };

  const handleEditChapter = (c: Chapter) => {
    setChapterForm({ title: c.title });
    setEditingChapterId(c.id);
    setShowChapterForm(true);
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("حذف هذا القسم؟ سيتم نقل دروسه لقسم 'بدون تصنيف'")) return;
    await supabase.from("lessons").update({ chapter_id: null }).eq("chapter_id", id);
    await supabase.from("chapters").delete().eq("id", id);
    loadData();
  };

  // ---------- Lesson CRUD ----------
  const resetForm = () => {
    setForm({
      title: "",
      video_url: "",
      description: "",
      content: "",
      sort_order: lessons.length + 1,
      lesson_type: "regular",
      is_published: false,
      is_preview: false,
      chapter_id: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openNewLesson = (chapterId: string | null) => {
    resetForm();
    setForm((f) => ({
      ...f,
      sort_order: lessons.length + 1,
      chapter_id: chapterId ?? "",
    }));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title,
      video_url: form.video_url || null,
      description: form.description || null,
      content: form.content || null,
      sort_order: form.sort_order,
      lesson_type: form.lesson_type,
      is_published: form.is_published,
      is_preview: form.is_preview,
      chapter_id: form.chapter_id || null,
    };
    if (editingId) {
      await supabase.from("lessons").update(payload).eq("id", editingId);
    } else {
      await supabase.from("lessons").insert({ ...payload, course_id: courseId });
    }
    resetForm();
    loadData();
  };

  const handleEdit = (l: Lesson) => {
    setForm({
      title: l.title,
      video_url: l.video_url || "",
      description: l.description || "",
      content: l.content || "",
      sort_order: l.sort_order,
      lesson_type: l.lesson_type,
      is_published: l.is_published,
      is_preview: l.is_preview,
      chapter_id: l.chapter_id || "",
    });
    setEditingId(l.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا الدرس؟")) return;
    await supabase.from("lessons").delete().eq("id", id);
    loadData();
  };

  // ---------- Drag & Drop ----------
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const persistLessonOrder = async (updated: Lesson[]) => {
    // Persist sort_order + chapter_id for each lesson
    await Promise.all(
      updated.map((l, idx) =>
        supabase
          .from("lessons")
          .update({ sort_order: idx + 1, chapter_id: l.chapter_id })
          .eq("id", l.id)
      )
    );
  };

  const handleChapterDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = chapters.findIndex((c) => c.id === active.id);
    const newIdx = chapters.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(chapters, oldIdx, newIdx);
    setChapters(reordered);
    await Promise.all(
      reordered.map((c, idx) => supabase.from("chapters").update({ sort_order: idx + 1 }).eq("id", c.id))
    );
  };

  const handleLessonDragEndForGroup = (chapterIdKey: string) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const groupLessons = lessons.filter(
      (l) => (l.chapter_id || UNASSIGNED) === chapterIdKey
    );
    const oldIdx = groupLessons.findIndex((l) => l.id === active.id);
    const newIdx = groupLessons.findIndex((l) => l.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reorderedGroup = arrayMove(groupLessons, oldIdx, newIdx);

    // Rebuild full lessons list with new order in this group
    const otherLessons = lessons.filter(
      (l) => (l.chapter_id || UNASSIGNED) !== chapterIdKey
    );
    const merged = [...otherLessons, ...reorderedGroup];
    // Order: sort by chapter group order, but easier: keep state updated locally
    setLessons(
      lessons.map((l) => {
        if ((l.chapter_id || UNASSIGNED) !== chapterIdKey) return l;
        const reorderedItem = reorderedGroup.find((r) => r.id === l.id);
        return reorderedItem || l;
      }).sort((a, b) => {
        // Sort within updated group; preserve other groups' relative order
        const aGroupOrder = (a.chapter_id || UNASSIGNED) === chapterIdKey
          ? reorderedGroup.findIndex((x) => x.id === a.id)
          : a.sort_order;
        const bGroupOrder = (b.chapter_id || UNASSIGNED) === chapterIdKey
          ? reorderedGroup.findIndex((x) => x.id === b.id)
          : b.sort_order;
        if ((a.chapter_id || UNASSIGNED) === chapterIdKey && (b.chapter_id || UNASSIGNED) === chapterIdKey) {
          return aGroupOrder - bGroupOrder;
        }
        return 0;
      })
    );

    await persistLessonOrder(merged);
    loadData();
  };

  const moveLessonToChapter = async (lessonId: string, chapterId: string | null) => {
    await supabase.from("lessons").update({ chapter_id: chapterId }).eq("id", lessonId);
    loadData();
  };

  // ---------- Render ----------
  const groupedLessons = (chapterId: string | null) =>
    lessons.filter((l) => (l.chapter_id ?? null) === chapterId);

  const unassignedLessons = lessons.filter((l) => !l.chapter_id);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/courses">
          <Button variant="ghost" size="sm">→ الكورسات</Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">دروس: {courseName}</h1>
      </div>

      <div className="flex flex-wrap justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => { resetChapterForm(); setShowChapterForm(true); }}>
          + إضافة قسم
        </Button>
        <Button variant="hero" onClick={() => openNewLesson(null)}>
          + إضافة درس
        </Button>
      </div>

      {/* Chapter form */}
      {showChapterForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">{editingChapterId ? "تعديل القسم" : "قسم جديد"}</h2>
          <div className="space-y-2 mb-4">
            <Label>عنوان القسم *</Label>
            <Input
              value={chapterForm.title}
              onChange={(e) => setChapterForm({ title: e.target.value })}
              placeholder="مثال: المقدمة"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="hero" onClick={handleSaveChapter}>
              {editingChapterId ? "حفظ" : "إضافة"}
            </Button>
            <Button variant="outline" onClick={resetChapterForm}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* Lesson form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">{editingId ? "تعديل الدرس" : "درس جديد"}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>عنوان الدرس *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>القسم</Label>
              <Select
                value={form.chapter_id || UNASSIGNED}
                onValueChange={(v) => setForm({ ...form, chapter_id: v === UNASSIGNED ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>بدون تصنيف</SelectItem>
                  {chapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>فيديو الدرس</Label>
              <VideoUpload value={form.video_url} onChange={(url) => setForm({ ...form, video_url: url })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>وصف الدرس</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>محتوى الدرس (نصي / Markdown)</Label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[100px] font-mono"
                placeholder="محتوى الدرس النصي..."
              />
            </div>
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={form.lesson_type} onValueChange={(v) => setForm({ ...form, lesson_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">عادي</SelectItem>
                  <SelectItem value="live">بث مباشر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              <span className="text-sm">منشور</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_preview}
                onChange={(e) => setForm({ ...form, is_preview: e.target.checked })}
              />
              <span className="text-sm">🎬 معاينة مجانية (يفتح للجميع بدون اشتراك)</span>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="hero" onClick={handleSave}>{editingId ? "حفظ" : "إضافة"}</Button>
            <Button variant="outline" onClick={resetForm}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* Chapters with lessons */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          جاري التحميل...
        </div>
      ) : (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChapterDragEnd}>
            <SortableContext items={chapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {chapters.map((chapter) => (
                <SortableChapter
                  key={chapter.id}
                  chapter={chapter}
                  lessons={groupedLessons(chapter.id)}
                  allChapters={chapters}
                  onEditChapter={handleEditChapter}
                  onDeleteChapter={handleDeleteChapter}
                  onAddLesson={() => openNewLesson(chapter.id)}
                  onEditLesson={handleEdit}
                  onDeleteLesson={handleDelete}
                  onMoveLesson={moveLessonToChapter}
                  onOpenResources={(l) => {
                    setResourcesLessonId(l.id);
                    setResourcesLessonTitle(l.title);
                  }}
                  onLessonDragEnd={handleLessonDragEndForGroup(chapter.id)}
                  sensors={sensors}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Unassigned lessons */}
          {(unassignedLessons.length > 0 || chapters.length === 0) && (
            <div className="bg-card rounded-xl border border-dashed border-border overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div className="font-semibold text-sm text-muted-foreground">
                  📂 بدون تصنيف ({unassignedLessons.length})
                </div>
                <Button variant="ghost" size="sm" onClick={() => openNewLesson(null)}>
                  + درس
                </Button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLessonDragEndForGroup(UNASSIGNED)}
              >
                <SortableContext
                  items={unassignedLessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="divide-y divide-border">
                    {unassignedLessons.length === 0 ? (
                      <li className="p-6 text-center text-muted-foreground text-sm">
                        لا توجد دروس بعد
                      </li>
                    ) : (
                      unassignedLessons.map((l) => (
                        <SortableLesson
                          key={l.id}
                          lesson={l}
                          chapters={chapters}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onMove={moveLessonToChapter}
                          onOpenResources={(lesson) => {
                            setResourcesLessonId(lesson.id);
                            setResourcesLessonTitle(lesson.title);
                          }}
                        />
                      ))
                    )}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      )}

      <LessonResourcesDialog
        lessonId={resourcesLessonId}
        lessonTitle={resourcesLessonTitle}
        open={!!resourcesLessonId}
        onClose={() => setResourcesLessonId(null)}
      />
    </div>
  );
}

// ---------- Sortable Chapter ----------
function SortableChapter({
  chapter,
  lessons,
  allChapters,
  onEditChapter,
  onDeleteChapter,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onMoveLesson,
  onOpenResources,
  onLessonDragEnd,
  sensors,
}: {
  chapter: Chapter;
  lessons: Lesson[];
  allChapters: Chapter[];
  onEditChapter: (c: Chapter) => void;
  onDeleteChapter: (id: string) => void;
  onAddLesson: () => void;
  onEditLesson: (l: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onMoveLesson: (lessonId: string, chapterId: string | null) => void;
  onOpenResources: (l: Lesson) => void;
  onLessonDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card rounded-xl border border-border overflow-hidden"
    >
      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            aria-label="اسحب لإعادة الترتيب"
          >
            ⋮⋮
          </button>
          <div className="font-bold text-foreground truncate">📁 {chapter.title}</div>
          <span className="text-xs text-muted-foreground">({lessons.length})</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={onAddLesson}>+ درس</Button>
          <Button variant="ghost" size="sm" onClick={() => onEditChapter(chapter)}>✏️</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteChapter(chapter.id)}
            className="text-destructive"
          >
            🗑️
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLessonDragEnd}>
        <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-border">
            {lessons.length === 0 ? (
              <li className="p-6 text-center text-muted-foreground text-sm">لا توجد دروس في هذا القسم</li>
            ) : (
              lessons.map((l) => (
                <SortableLesson
                  key={l.id}
                  lesson={l}
                  chapters={allChapters}
                  onEdit={onEditLesson}
                  onDelete={onDeleteLesson}
                  onMove={onMoveLesson}
                  onOpenResources={onOpenResources}
                />
              ))
            )}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------- Sortable Lesson ----------
function SortableLesson({
  lesson,
  chapters,
  onEdit,
  onDelete,
  onMove,
  onOpenResources,
}: {
  lesson: Lesson;
  chapters: Chapter[];
  onEdit: (l: Lesson) => void;
  onDelete: (id: string) => void;
  onMove: (lessonId: string, chapterId: string | null) => void;
  onOpenResources: (l: Lesson) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 hover:bg-muted/30">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        aria-label="اسحب لإعادة الترتيب"
      >
        ⋮⋮
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-foreground truncate flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#{lesson.sort_order}</span>
          {lesson.title}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{lesson.lesson_type === "live" ? "🔴 مباشر" : "🎬 عادي"}</span>
          <span
            className={`px-2 py-0.5 rounded-full ${
              lesson.is_published
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {lesson.is_published ? "منشور" : "مسودة"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Select
          value={lesson.chapter_id || UNASSIGNED}
          onValueChange={(v) => onMove(lesson.id, v === UNASSIGNED ? null : v)}
        >
          <SelectTrigger className="h-8 w-32 text-xs hidden md:flex">
            <SelectValue placeholder="القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>بدون تصنيف</SelectItem>
            {chapters.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenResources(lesson)}
          title="إدارة الملفات"
        >
          📎
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(lesson)}>✏️</Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(lesson.id)}
          className="text-destructive"
        >
          🗑️
        </Button>
      </div>
    </li>
  );
}
