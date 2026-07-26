import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سلة الشراء — معلوم" },
      { name: "description", content: "راجع الكورسات في سلتك وأكمل الشراء على منصة معلوم" },
    ],
  }),
  component: CartPage,
});

interface CartCourseExt {
  is_free: boolean;
}

function CartPage() {
  const { items, count, total, loading, removeFromCart, clearCart, refresh } = useCart();
  const navigate = useNavigate();
  const { openCheckout, loading: checkoutLoading } = useStripeCheckout();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [extras, setExtras] = useState<Record<string, CartCourseExt>>({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setUserEmail(session?.user?.email);
      setAuthChecked(true);
    });
  }, []);

  // Load is_free for all cart courses
  useEffect(() => {
    if (items.length === 0) return;
    const courseIds = items.map((i) => i.course_id);
    supabase
      .from("courses")
      .select("id, is_free")
      .in("id", courseIds)
      .then(({ data }) => {
        const map: Record<string, CartCourseExt> = {};
        data?.forEach((c: any) => {
          map[c.id] = { is_free: c.is_free };
        });
        setExtras(map);
      });
  }, [items]);

  const freeItems = items.filter((i) => extras[i.course_id]?.is_free || i.course.price === 0);
  const paidItems = items.filter((i) => !(extras[i.course_id]?.is_free || i.course.price === 0));
  const paidItemsReady = paidItems;
  const paidTotal = paidItems.reduce((s, i) => s + Number(i.course.price || 0), 0);
  const paidCurrencies = Array.from(new Set(paidItems.map((i) => (i.course.currency || "SAR").toUpperCase())));
  const paidCurrency = paidCurrencies[0] || "SAR";
  const mixedCurrencies = paidCurrencies.length > 1;

  const handleCheckout = async () => {
    if (mixedCurrencies) {
      toast.error("لا يمكن دفع كورسات بعملات مختلفة معاً", {
        description: "احذف الكورسات التي تختلف عملتها ثم أعد المحاولة.",
      });
      return;
    }
    if (!userId || items.length === 0) return;
    setProcessing(true);

    // 1. Enroll free items immediately
    if (freeItems.length > 0) {
      const enrollments = freeItems.map((i) => ({ user_id: userId, course_id: i.course_id }));
      const { error } = await supabase.from("enrollments").insert(enrollments);
      if (error && !error.message.includes("duplicate")) {
        toast.error("تعذر تسجيل الكورسات المجانية", { description: error.message });
        setProcessing(false);
        return;
      }
      // Remove free items from cart
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId)
        .in("course_id", freeItems.map((i) => i.course_id));
      if (freeItems.length > 0 && paidItemsReady.length === 0) {
        toast.success(`✅ تم تسجيلك في ${freeItems.length} كورس مجاني`);
      }
      await refresh();
    }

    // 2. Open Stripe checkout for paid items
    if (paidItemsReady.length > 0) {
      await openCheckout({
        items: paidItemsReady.map((i) => ({ courseId: i.course_id })),
        userId,
        customerEmail: userEmail,
      });
      // openCheckout redirects to Stripe; no further code after this runs on success
      return;
    } else if (freeItems.length > 0) {
      navigate({ to: "/profile" });
    }

    setProcessing(false);
  };

  if (!authChecked || loading) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="py-20 text-center px-4">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-foreground mb-3">سجّل الدخول لعرض سلتك</h1>
        <p className="text-muted-foreground mb-6">احفظ كورساتك المفضلة وأكمل التسجيل في أي وقت</p>
        <Link to="/login">
          <Button variant="hero" size="lg">دخول</Button>
        </Link>
      </div>
    );
  }

  const busy = processing || checkoutLoading;

  return (
    <div className="py-8 lg:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            🛒 سلة الشراء {count > 0 && <span className="text-base font-medium text-muted-foreground">({count})</span>}
          </h1>
          {count > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>إفراغ السلة</Button>
          )}
        </div>

        {count === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">🛍️</div>
            <h2 className="text-xl font-bold text-foreground mb-2">سلتك فارغة</h2>
            <p className="text-muted-foreground mb-6">تصفح الكورسات وأضف ما يعجبك</p>
            <Link to="/courses">
              <Button variant="hero" size="lg">تصفح الكورسات</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => {
                const ext = extras[item.course_id];
                const isFree = ext?.is_free || item.course.price === 0;
                return (
                  <div key={item.id} className="bg-card rounded-2xl border border-border p-4 flex gap-4">
                    <Link to="/courses/$courseId" params={{ courseId: item.course_id }} className="shrink-0">
                      {item.course.image_url ? (
                        <img src={item.course.image_url} alt={item.course.title} className="w-24 h-24 rounded-xl object-cover" />
                      ) : (
                        <div className="w-24 h-24 rounded-xl gradient-hero" />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to="/courses/$courseId" params={{ courseId: item.course_id }}>
                        <h3 className="font-bold text-foreground hover:text-primary transition-colors">{item.course.title}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mb-2">{item.course.instructor}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-extrabold text-foreground">
                          {isFree ? "مجاني" : formatPrice(item.course.price, item.course.currency)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.course_id)}
                          className="text-sm text-destructive hover:underline"
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border p-6 sticky top-20">
                <h2 className="text-lg font-bold text-foreground mb-4">ملخص الطلب</h2>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>الكورسات المجانية</span>
                    <span>{freeItems.length}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>الكورسات المدفوعة</span>
                    <span>{paidItems.length}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between text-lg font-extrabold text-foreground">
                    <span>إجمالي الدفع</span>
                    <span>{formatPrice(paidTotal, paidCurrency)}</span>
                  </div>
                  {mixedCurrencies && (
                    <p className="text-xs text-destructive mt-2">
                      ⚠️ سلتك تحتوي كورسات بعملات مختلفة ({paidCurrencies.join("، ")}). الرجاء دفع كل عملة على حدة.
                    </p>
                  )}
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={busy || mixedCurrencies || (freeItems.length === 0 && paidItemsReady.length === 0)}
                >
                  {busy
                    ? "جاري المعالجة..."
                    : paidItemsReady.length > 0
                    ? `إتمام الدفع — ${formatPrice(paidTotal, paidCurrency)}`
                    : freeItems.length > 0
                    ? "تأكيد التسجيل المجاني"
                    : "لا يوجد ما يمكن دفعه"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  💳 الدفع آمن ومُشفّر عبر Stripe. تصلك الفاتورة على بريدك الإلكتروني تلقائياً.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
