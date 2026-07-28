import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OpenBookCheckoutOptions {
  bookId: string;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
}

export function useBookCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: OpenBookCheckoutOptions) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-book-checkout", {
        body: {
          bookId: options.bookId,
          successUrl:
            options.successUrl || `${window.location.origin}/books/${options.bookId}?purchase=success`,
          cancelUrl: options.cancelUrl || `${window.location.origin}/books/${options.bookId}`,
          customerEmail: options.customerEmail,
        },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || data?.error || "تعذّر إنشاء جلسة الدفع");
      }
      window.location.href = data.url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      toast.error("تعذّر فتح صفحة الدفع", { description: message });
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
