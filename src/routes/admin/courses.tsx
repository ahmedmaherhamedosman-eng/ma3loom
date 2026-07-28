import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/courses")({
  head: () => ({ meta: [{ title: "إدارة الكورسات — معلوم" }] }),
  component: AdminCourses,
});

type Course = Tables<"courses">;
type Category = Tables<"categories">;

interface CourseStats {
  enrollments: number;
  avgProgress: number;
}

type CertificateRequirement = "completion" | "quiz" | "both" | "none";

interface EnrollmentProgressRow {
  course_id: string;
  progress_percentage: number | null;
}

function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courseCategoryMap, setCourseCategoryMap] = useState<Record<string, string[]>>({});
  const [courseStatsMap, setCourseStatsMap] = useState<Record<string, CourseStats>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterPrice, setFilterPrice] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    title: "",
    description: "",
    image_url: "",
    preview_video_url: "",
    price: 0,
    is_free: true,
    level: "مبتدئ",
    category: "علوم",
    instructor: "",
    lessons_count: 0,
    is_published: false,
    certificate_requirement: "completion" as "completion" | "quiz" | "both" | "none",
  });

  const loadCourses = async () => {
    const [{ data: cData }, { data: catData }, { data: ccData }, { data: enrollData }] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("course_categories").select("course_id, category_id"),
      supabase.from("enrollments").select("course_id, progress_percentage"),
    ]);
    setCourses(cData || []);
    setCategories(catData || []);
    const map: Record<string, string[]> = {};
    (ccData || []).forEach((row) => {
      if (!map[row.course_id]) map[row.course_id] = [];
      map[row.course_id].push(row.category_id);
    });
    setCourseCategoryMap(map);

    const statsMap: Record<string, CourseStats> = {};
    (((enrollData as EnrollmentProgressRow[] | null) || [])).forEach((e) => {
      if (!statsMap[e.course_id]) statsMap[e.course_id] = { enrollments: 0, avgProgress: 0 };
      statsMap[e.course_id].enrollments++;
      statsMap[e.course_id].avgProgress += e.progress_percentage || 0;
    });
    Object.keys(statsMap).forEach((k) => {
      const s = statsMap[k];
      s.avgProgress = s.enrollments > 0 ? Math.round(s.avgProgress / s.enrollments) : 0;
    });
    setCourseStatsMap(statsMap);
    setLoading(false);
  };

  useEffect(() => { loadCourses(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", image_url: "", preview_video_url: "", price: 0, is_free: true, level: "مبتدئ", category: "علوم", instructor: "", lessons_count: 0, is_published: false, certificate_requirement: "completion" });
    setSelectedCats([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = { ...form, price: form.is_free ? 0 : form.price };

    let courseId = editingId;
    if (editingId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editingId);
      if (error) return toast.error("فشل الحفظ", { description: error.message });
    } else {
      const { data, error } = await supabase.from("courses").insert(payload).select("id").single();
      if (error || !data) return toast.error("فشل الإضافة", { description: error?.message });
      courseId = data.id;
    }

    if (courseId) {
      await supabase.from("course_categories").delete().eq("course_id", courseId);
      if (selectedCats.length > 0) {
        await supabase.from("course_categories").insert(
          selectedCats.map((category_id) => ({ course_id: courseId!, category_id }))
        );
      }
    }

    toast.success(editingId ? "تم تحديث الكورس" : "تم إضافة الكورس");
    resetForm();
    loadCourses();
  };

  const handleEdit = (course: Course) => {
    setForm({
      title: course.title,
      description: course.description || "",
      image_url: course.image_url || "",
      preview_video_url: course.preview_video_url || "",
      price: course.price,
      is_free: course.is_free,
      level: course.level,
      category: course.category,
      instructor: course.instructor,
      lessons_count: course.lessons_count,
      is_published: course.is_published,
      certificate_requirement: ((course as Course & { certificate_requirement?: CertificateRequirement }).certificate_requirement || "completion") as CertificateRequirement,
    });
    setSelectedCats(courseCategoryMap[course.id] || []);
    setEditingId(course.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكورس؟")) return;
    await supabase.from("courses").delete().eq("id", id);
    loadCourses();
  };

  const handleDuplicate = async (course: Course) => {
    if (!confirm(`نسخ الكورس "${course.title}"؟`)) return;
    const payload = {
      title: `${course.title} (نسخة)`,
      description: course.description,
      image_url: course.image_url,
      preview_video_url: course.preview_video_url,
      price: course.price,
      is_free: course.is_free,
      level: course.level,
      category: course.category,
      instructor: course.instructor,
      lessons_count: course.lessons_count,
      is_published: false,
    };
    const { data, error } = await supabase
      .from("courses")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return toast.error("فشل النسخ", { description: error?.message });
    const cats = courseCategoryMap[course.id] || [];
    if (cats.length > 0) {
      await supabase.from("course_categories").insert(cats.map((category_id) => ({ course_id: data.id, category_id })));
    }
    toast.success("تم نسخ الكورس");
    loadCourses();
  };

  const handleBulkPublish = async (publish: boolean) => {
    if (bulkSelected.size === 0) return;
    const ids = Array.from(bulkSelected);
    const { error } = await supabase.from("courses").update({ is_published: publish }).in("id", ids);
    if (error) return toast.error("فشلت العملية", { description: error.message });
    toast.success(`تم ${publish ? "نشر" : "إخفاء"} ${ids.length} كورس`);
    setBulkSelected(new Set());
    loadCourses();
  };

  const toggleBulk = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredCourses = courses.filter((c) => {
    const matchSearch = !search || c.title.includes(search) || c.instructor.includes(search);
    const matchPrice =
      filterPrice === "all" ||
      (filterPrice === "free" && (c.is_free || c.price === 0)) ||
      (filterPrice === "paid" && !c.is_free && c.price > 0);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && c.is_published) ||
      (filterStatus === "draft" && !c.is_published);
    const matchCat = filterCategory === "all" || (courseCategoryMap[c.id] || []).includes(filterCategory);
    return matchSearch && matchPrice && matchStatus && matchCat;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة الكورسات</h1>
        <Button variant="hero" onClick={() => { resetForm(); setShowForm(true); }}>
          + إضافة كورس
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">{editingId ? "تعديل الكورس" : "كورس جديد"}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>اسم الكورس *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: أساسيات الرياضيات" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>الوصف</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
                placeholder="وصف مختصر للكورس"
              />
            </div>
            <div className="space-y-2">
              <Label>المدرّس</Label>
              <Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} placeholder="أ. أحمد محمد" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>صورة الغلاف</Label>
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                folder="courses"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>رابط الفيديو التعريفي (Preview)</Label>
              <Input
                value={form.preview_video_url}
                onChange={(e) => setForm({ ...form, preview_video_url: e.target.value })}
                placeholder="https://... (YouTube/Vimeo/MP4)"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">يظهر في صفحة الكورس قبل الشراء لجذب الطلاب</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>نوع الكورس</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 rounded-lg border border-border hover:bg-muted/50">
                  <input
                    type="radio"
                    checked={form.is_free}
                    onChange={() => setForm({ ...form, is_free: true, price: 0 })}
                  />
                  <span className="text-sm">مجاني</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 rounded-lg border border-border hover:bg-muted/50">
                  <input
                    type="radio"
                    checked={!form.is_free}
                    onChange={() => setForm({ ...form, is_free: false })}
                  />
                  <span className="text-sm">مدفوع</span>
                </label>
              </div>
            </div>
            {!form.is_free && (
              <div className="space-y-2">
                <Label>السعر بالدولار ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0.7}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  placeholder="9.99"
                />
                <p className="text-xs text-muted-foreground">⚠️ بعد الحفظ اضغط "ربط بالدفع" لتفعيل الشراء</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>عدد الدروس</Label>
              <Input type="number" value={form.lessons_count} onChange={(e) => setForm({ ...form, lessons_count: Number(e.target.value) })} min={0} />
            </div>
            <div className="space-y-2">
              <Label>المستوى</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                  <SelectItem value="متوسط">متوسط</SelectItem>
                  <SelectItem value="متقدم">متقدم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>شرط الحصول على الشهادة 🎓</Label>
              <Select
                value={form.certificate_requirement}
                onValueChange={(v) => setForm({ ...form, certificate_requirement: v as CertificateRequirement })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion">إكمال 100% من الدروس</SelectItem>
                  <SelectItem value="quiz">اجتياز الاختبار النهائي فقط</SelectItem>
                  <SelectItem value="both">إكمال الدروس + اجتياز الاختبار</SelectItem>
                  <SelectItem value="none">بدون شهادة لهذا الكورس</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                يحدد متى يُسمح للطالب بإصدار شهادة إكمال الكورس
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>التصنيفات (يمكن اختيار أكثر من واحد)</Label>
              {categories.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 rounded-lg border border-dashed border-border">
                  لا توجد تصنيفات بعد. أضف من <Link to="/admin/categories" className="text-primary underline">صفحة التصنيفات</Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-muted/20">
                  {categories.map((cat) => {
                    const active = selectedCats.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setSelectedCats((prev) =>
                            active ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">منشور (ظاهر للطلاب)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="hero" onClick={handleSave}>
              {editingId ? "حفظ التعديلات" : "إضافة الكورس"}
            </Button>
            <Button variant="outline" onClick={resetForm}>إلغاء</Button>
          </div>
        </div>
      )}

      {/* Filters & bulk */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Input placeholder="بحث بالاسم أو المدرّس..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:w-32">
          <option value="all">السعر</option>
          <option value="free">مجاني</option>
          <option value="paid">مدفوع</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:w-32">
          <option value="all">الحالة</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:w-40">
          <option value="all">كل التصنيفات</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {bulkSelected.size > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-primary flex-1">تم اختيار {bulkSelected.size} كورس</span>
          <Button size="sm" variant="outline" onClick={() => handleBulkPublish(true)}>📢 نشر</Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkPublish(false)}>🙈 إخفاء</Button>
          <Button size="sm" variant="ghost" onClick={() => setBulkSelected(new Set())}>✕ إلغاء</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredCourses.length > 0 && filteredCourses.every((c) => bulkSelected.has(c.id))}
                    onChange={(e) => {
                      if (e.target.checked) setBulkSelected(new Set(filteredCourses.map((c) => c.id)));
                      else setBulkSelected(new Set());
                    }}
                  />
                </th>
                <th className="text-right p-3 font-medium text-muted-foreground">الكورس</th>
                <th className="text-right p-3 font-medium text-muted-foreground">السعر</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">الدفع</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">الطلاب</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">متوسط التقدم</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">التقييم</th>
                <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">الحالة</th>
                <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>
              ) : filteredCourses.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">لا توجد نتائج</td></tr>
              ) : (
                filteredCourses.map((course) => {
                  const stats = courseStatsMap[course.id] || { enrollments: 0, avgProgress: 0 };
                  return (
                  <tr key={course.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">
                      <input type="checkbox" checked={bulkSelected.has(course.id)} onChange={() => toggleBulk(course.id)} />
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{course.title}</div>
                      <div className="text-xs text-muted-foreground">{course.instructor} · {course.category}</div>
                    </td>
                    <td className="p-3">
                      {course.is_free || course.price === 0
                        ? <span className="text-success font-medium">مجاني</span>
                        : <span className="font-medium">${course.price}</span>
                      }
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {course.is_free ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">✅ Stripe</span>
                      )}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <div className="font-semibold">{stats.enrollments}</div>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className="text-xs font-bold">{stats.avgProgress}%</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {course.rating_count > 0 ? (
                        <span className="text-xs font-bold text-warm-foreground">
                          {Number(course.rating_avg).toFixed(1)} ⭐ ({course.rating_count})
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full ${course.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {course.is_published ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        <Link to="/courses/$courseId" params={{ courseId: course.id }}>
                          <Button variant="ghost" size="sm" title="معاينة" className="text-primary">👁️</Button>
                        </Link>
                        <Link to="/admin/lessons/$courseId" params={{ courseId: course.id }}>
                          <Button variant="ghost" size="sm" title="الدروس">🎬</Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(course)} title="نسخ">📄</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(course)} title="تعديل">✏️</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(course.id)} title="حذف" className="text-destructive">🗑️</Button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
