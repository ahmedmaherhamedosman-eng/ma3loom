import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OpenOptions {
  sessionId: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export function useLiveSessionCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: OpenOptions) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-live-checkout", {
        body: {
          sessionId: options.sessionId,
          customerEmail: options.customerEmail,
          successUrl:
            options.successUrl || `${window.location.origin}/live-classes?checkout=success`,
          cancelUrl: options.cancelUrl || `${window.location.origin}/live-classes`,
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
