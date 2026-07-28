import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/CourseCard";

interface Props {
  courseId: string;
  categoryIds: string[];
}

interface CourseCategoryLink {
  course_id: string;
}

interface SimilarCourseItem {
  id: string;
  title: string;
  description: string | null;
  instructor: string;
  category: string;
  level: string;
  students_count: number;
  lessons_count: number;
  price: number;
  currency: string | null;
  image_url: string | null;
  rating_avg: number | null;
  rating_count: number | null;
}

export function SimilarCourses({ courseId, categoryIds }: Props) {
  const [items, setItems] = useState<SimilarCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryIdsKey = categoryIds.join(",");

  useEffect(() => {
    const load = async () => {
      let courseIds: string[] = [];
      if (categoryIds.length > 0) {
        const { data: links } = await supabase
          .from("course_categories")
          .select("course_id")
          .in("category_id", categoryIds)
          .neq("course_id", courseId);
        courseIds = Array.from(new Set(((links as CourseCategoryLink[] | null) || []).map((l) => l.course_id)));
      }

      let query = supabase
        .from("courses")
        .select("*")
        .eq("is_published", true)
        .neq("id", courseId)
        .limit(3);

      if (courseIds.length > 0) {
        query = query.in("id", courseIds);
      } else {
        // fallback: top viewed
        query = query.order("views_count", { ascending: false });
      }

      const { data } = await query;
      setItems((data as SimilarCourseItem[] | null) || []);
      setLoading(false);
    };
    load();
  }, [courseId, categoryIds, categoryIdsKey]);

  if (loading || items.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-foreground mb-4">كورسات مشابهة</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((c) => (
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
            price={c.price === 0 ? "مجاني" : c.price}
            currency={c.currency}
            image={c.image_url || ""}
            rating={Number(c.rating_avg) || 0}
            ratingCount={c.rating_count || 0}
          />
        ))}
      </div>
    </div>
  );
}
