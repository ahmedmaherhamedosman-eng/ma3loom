import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/blog/$postId")({
  head: () => ({
    meta: [
      { title: "مقال — معلوم" },
      { name: "description", content: "اقرأ المقال على منصة معلوم" },
    ],
  }),
  component: BlogPostPage,
});

interface Post {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
}

function BlogPostPage() {
  const { postId } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .eq("status", "published")
        .single();
      if (data) setPost(data as Post);
      setLoading(false);
    };
    load();
  }, [postId]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-3xl px-4 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">المقال غير موجود</h1>
        <Link to="/blog">
          <Button variant="hero">العودة للمدونة</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 lg:py-16">
      <article className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8">
          <Link to="/blog" className="text-sm text-primary hover:underline mb-4 inline-block">
            ← العودة للمدونة
          </Link>
          <time className="block text-sm text-muted-foreground mb-3">
            {formatDate(post.published_at || post.created_at)}
          </time>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">{post.title}</h1>
        </div>

        {post.image_url && (
          <div className="rounded-2xl overflow-hidden mb-8">
            <img src={post.image_url} alt={post.title} className="w-full h-auto" />
          </div>
        )}

        <div
          className="prose prose-lg max-w-none text-foreground leading-relaxed"
          style={{ direction: "rtl" }}
        >
          {post.content ? (
            post.content.split("\n").map((para, i) => (
              para.trim() ? <p key={i} className="mb-4 text-foreground/90">{para}</p> : null
            ))
          ) : (
            <p className="text-muted-foreground">لا يوجد محتوى لهذا المقال</p>
          )}
        </div>
      </article>
    </div>
  );
}
