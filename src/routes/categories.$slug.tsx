import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface CourseCategoryLink {
  course_id: string;
}

interface EnrollmentCourseRow {
  course_id: string;
}

interface CourseCardRow {
  id: string;
  title: string;
  description: string | null;
  instructor: string;
  category: string;
  level: string;
  students_count: number;
  lessons_count: number;
  is_free: boolean;
  price: number;
  currency: string | null;
  image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
}

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `تصنيف ${params.slug} — معلوم` },
      { name: "description", content: `كورسات في تصنيف ${params.slug} على منصة معلوم` },
    ],
  }),
  component: CategoryPage,
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">التصنيف غير موجود</h1>
      <Link to="/courses"><Button variant="hero">كل الكورسات</Button></Link>
    </div>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [category, setCategory] = useState<{ id: string; name: string } | null>(null);
  const [courses, setCourses] = useState<CourseCardRow[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: cat } = await supabase
        .from("categories")
        .select("id, name")
        .eq("slug", slug)
        .maybeSingle();

      if (!cat) {
        setLoading(false);
        return;
      }
      setCategory(cat);

      const { data: links } = await supabase
        .from("course_categories")
        .select("course_id")
        .eq("category_id", cat.id);
      const courseIds = ((links as CourseCategoryLink[] | null) || []).map((l) => l.course_id);

      if (courseIds.length === 0) {
        setCourses([]);
      } else {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .in("id", courseIds)
          .eq("is_published", true)
          .order("created_at", { ascending: false });
        setCourses((data as CourseCardRow[] | null) || []);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: enr } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", session.user.id);
        setEnrolledIds(new Set(((enr as EnrollmentCourseRow[] | null) || []).map((e) => e.course_id)));
      }

      setLoading(false);
    };
    load();
  }, [slug]);

  if (!loading && !category) {
    return (
      <div className="py-20 text-center px-4">
        <h1 className="text-2xl font-bold text-foreground mb-3">التصنيف غير موجود</h1>
        <p className="text-muted-foreground mb-6">لا يوجد تصنيف بهذا الاسم.</p>
        <Link to="/courses"><Button variant="hero">عرض كل الكورسات</Button></Link>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm text-muted-foreground mb-2">تصنيف</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
            {loading ? <Skeleton className="h-10 w-48 mx-auto" /> : category?.name}
          </h1>
          {!loading && (
            <p className="text-muted-foreground mt-3">{courses.length} كورس متاح</p>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <p className="text-muted-foreground text-lg mb-4">لا توجد كورسات في هذا التصنيف بعد</p>
            <Link to="/courses"><Button variant="hero">تصفح كل الكورسات</Button></Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => (
              <CourseCard
                key={c.id}
                courseId={c.id}
                title={c.title}
                description={c.description || ""}
                instructor={c.instructor}
                category={c.category}
                level={c.level}
                students={c.students_count}
                lessons={c.lessons_count}
                price={c.is_free || c.price === 0 ? "مجاني" : c.price}
                currency={c.currency}
                image={c.image_url || ""}
                rating={Number(c.rating_avg) || 0}
                ratingCount={c.rating_count || 0}
                isEnrolled={enrolledIds.has(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
