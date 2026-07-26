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
    } catch (e: any) {
      toast.error("تعذّر فتح صفحة الدفع", { description: e?.message });
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
