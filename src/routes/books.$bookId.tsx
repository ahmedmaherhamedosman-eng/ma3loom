import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBookCheckout } from "@/hooks/useBookCheckout";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/books/$bookId")({
  component: BookDetailsPage,
});

type Book = Tables<"books">;

function BookDetailsPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [purchased, setPurchased] = useState(false);
  const { openCheckout, loading: checkoutLoading } = useBookCheckout();

  // Detect ?purchase=success returning from Stripe
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("purchase") === "success") {
      toast.success("🎉 تم الشراء بنجاح! الكتاب متاح الآن للتحميل.");
      url.searchParams.delete("purchase");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email);

      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .eq("is_published", true)
        .maybeSingle();

      if (!data) {
        setLoading(false);
        return;
      }
      setBook(data);

      // Increment views (best-effort)
      supabase.from("books").update({ views_count: (data.views_count || 0) + 1 }).eq("id", bookId).then();

      if (session?.user && !data.is_free) {
        const { data: purchase } = await supabase
          .from("book_purchases")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("book_id", bookId)
          .maybeSingle();
        setPurchased(!!purchase);
      }

      setLoading(false);
    })();
  }, [bookId]);

  const handleDownload = async () => {
    if (!book) return;
    if (!book.is_free && !purchased) {
      toast.error("يجب شراء الكتاب أولاً");
      return;
    }
    // Prefer a fresh signed URL from the stored path (bucket is private).
    // Fallback to legacy pdf_url if pdf_path is missing.
    let openUrl: string | null = null;
    if (book.pdf_path) {
      const { data, error } = await supabase.storage
        .from("books")
        .createSignedUrl(book.pdf_path, 60 * 60);
      if (error || !data?.signedUrl) {
        console.error("Signed URL error:", error);
        toast.error("تعذر إنشاء رابط التحميل");
        return;
      }
      openUrl = data.signedUrl;
    } else if (book.pdf_url) {
      openUrl = book.pdf_url;
    }
    if (!openUrl) {
      toast.error("ملف الكتاب غير متاح حالياً");
      return;
    }
    await supabase.from("books").update({ downloads_count: (book.downloads_count || 0) + 1 }).eq("id", book.id);
    window.open(openUrl, "_blank");
  };

  const handlePurchase = async () => {
    if (!userId) {
      toast.error("سجّل دخولك أولاً للشراء");
      navigate({ to: "/login" });
      return;
    }
    if (!book) return;
    await openCheckout({ bookId: book.id, customerEmail: userEmail });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center bg-card rounded-2xl border border-border p-8 max-w-md">
          <div className="text-5xl mb-3">📕</div>
          <h1 className="text-xl font-bold text-foreground mb-2">الكتاب غير موجود</h1>
          <Link to="/books" className="text-primary hover:underline text-sm">العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  const canDownload = book.is_free || purchased;

  return (
    <div className="min-h-[80vh] bg-background py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link to="/books" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          ← العودة للمكتبة
        </Link>

        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Cover */}
          <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 to-warm/10 rounded-2xl overflow-hidden flex items-center justify-center text-7xl shadow-lg">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <span>📕</span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {book.is_free ? (
                <span className="text-xs font-bold bg-emerald-500 text-white rounded-full px-3 py-1">🆓 مجاني</span>
              ) : (
                <span className="text-xs font-bold bg-warm text-warm-foreground rounded-full px-3 py-1">{formatPrice(book.price, book.currency)}</span>
              )}
              <span className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1">{book.education_level}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{book.title}</h1>
            {book.author && <p className="text-muted-foreground">✍️ المؤلف: {book.author}</p>}

            {book.description && (
              <p className="text-foreground/80 leading-relaxed">{book.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-y border-border py-3">
              {book.pages_count > 0 && <span>📄 {book.pages_count} صفحة</span>}
              {book.file_size_mb > 0 && <span>💾 {book.file_size_mb} MB</span>}
              <span>👁️ {book.views_count} مشاهدة</span>
              <span>⬇️ {book.downloads_count} تحميل</span>
            </div>

            {canDownload ? (
              <Button variant="hero" size="lg" onClick={handleDownload} className="w-full sm:w-auto">
                ⬇️ تحميل الكتاب PDF
              </Button>
            ) : (
              <Button variant="hero" size="lg" onClick={handlePurchase} disabled={checkoutLoading} className="w-full sm:w-auto">
                {checkoutLoading ? "جاري التحويل للدفع..." : `💳 شراء بـ ${formatPrice(book.price, book.currency)}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
