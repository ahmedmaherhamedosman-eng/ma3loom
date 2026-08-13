import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "كل الكورسات — معلوم" },
      { name: "description", content: "استكشف كل كورسات منصة معلوم التعليمية في مختلف المجالات والتخصصات." },
    ],
  }),
  component: CoursesIndexPage,
});

function CoursesIndexPage() {
  const [courses, setCourses] = useState<CourseCardRow[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCourses = async () => {
      try {
        const [coursesRes, sessionRes] = await Promise.all([
          supabase
            .from("courses")
            .select("id,title,description,instructor,category,level,students_count,lessons_count,is_free,price,currency,image_url,rating_avg,rating_count")
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
          supabase.auth.getSession(),
        ]);

        if (!mounted) return;

        setCourses((coursesRes.data as CourseCardRow[] | null) || []);

        const session = sessionRes.data.session;
        if (session) {
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("course_id")
            .eq("user_id", session.user.id);

          if (!mounted) return;

          setEnrolledIds(new Set(((enrollments as { course_id: string }[] | null) || []).map((e) => e.course_id)));
        }
      } catch (error) {
        console.error("Failed to load courses page", error);
        if (mounted) {
          setCourses([]);
          setEnrolledIds(new Set());
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-[80vh] bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm text-muted-foreground">استكشف</p>
          <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">كل الكورسات</h1>
          <p className="mt-3 text-muted-foreground">اختر الكورس المناسب لك وابدأ التعلم الآن</p>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Skeleton key={item} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-lg text-muted-foreground">لا توجد كورسات منشورة حاليًا.</p>
            <Link to="/" className="mt-6 inline-block">
              <Button variant="hero">العودة للرئيسية</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                courseId={course.id}
                title={course.title}
                description={course.description || ""}
                instructor={course.instructor}
                category={course.category}
                level={course.level}
                students={course.students_count}
                lessons={course.lessons_count}
                price={course.is_free || course.price === 0 ? "مجاني" : course.price}
                currency={course.currency ?? undefined}
                image={course.image_url || ""}
                rating={Number(course.rating_avg) || 0}
                ratingCount={course.rating_count || 0}
                isEnrolled={enrolledIds.has(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
