import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "المدونة — معلوم" },
      { name: "description", content: "مقالات ونصائح تعليمية من فريق منصة معلوم" },
      { property: "og:title", content: "المدونة — معلوم" },
      { property: "og:description", content: "مقالات ونصائح تعليمية من فريق منصة معلوم" },
    ],
  }),
  component: BlogPage,
});

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
}

function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, excerpt, image_url, published_at, created_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (data) setPosts(data);
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">المدونة</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            مقالات ونصائح تعليمية لمساعدتك في رحلة التعلم
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">لا توجد مقالات حالياً</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to="/blog/$postId"
                params={{ postId: post.id }}
                className="bg-card rounded-2xl border border-border overflow-hidden card-hover block"
              >
                <div className="h-48 overflow-hidden">
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gradient-hero" />
                  )}
                </div>
                <div className="p-5">
                  <time className="text-xs text-muted-foreground">
                    {formatDate(post.published_at || post.created_at)}
                  </time>
                  <h2 className="font-bold text-lg text-foreground mt-2 mb-2 line-clamp-2">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-muted-foreground text-sm line-clamp-2">{post.excerpt}</p>
                  )}
                  <span className="inline-block mt-3 text-sm font-semibold text-primary">
                    اقرأ المزيد ←
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
