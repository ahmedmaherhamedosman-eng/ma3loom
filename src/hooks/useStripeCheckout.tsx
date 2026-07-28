import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CheckoutItem {
  courseId: string;
}

interface OpenCheckoutOptions {
  items: CheckoutItem[];
  userId: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: OpenCheckoutOptions) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
        body: {
          courseIds: options.items.map((i) => i.courseId),
          userId: options.userId,
          customerEmail: options.customerEmail,
          successUrl:
            options.successUrl || `${window.location.origin}/profile?checkout=success`,
          cancelUrl: options.cancelUrl || `${window.location.origin}/cart`,
        },
      });

      if (error || !data?.url) {
        throw new Error(error?.message || data?.error || "تعذّر إنشاء جلسة الدفع");
      }

      // Redirect to Stripe-hosted checkout
      window.location.href = data.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      toast.error("تعذّر فتح صفحة الدفع", { description: message });
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
