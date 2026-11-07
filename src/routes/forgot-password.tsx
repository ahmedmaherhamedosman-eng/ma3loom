import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "استعادة كلمة المرور — معلوم" },
      { name: "description", content: "استعد كلمة المرور الخاصة بحسابك على منصة معلوم" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-4">
              <img src="/logo.png" alt="معلوم" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">استعادة كلمة المرور</h1>
            <p className="text-sm text-muted-foreground mt-1">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="bg-primary/10 text-primary rounded-lg p-4">
                <p className="font-semibold">تم إرسال رابط الاستعادة ✉️</p>
                <p className="text-sm mt-1">تحقق من بريدك الإلكتروني <span className="font-mono text-xs">{email}</span></p>
              </div>
              <Link to="/login" className="text-primary font-semibold hover:underline text-sm">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-6 text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? "جاري الإرسال..." : "أرسل رابط الاستعادة"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                تذكرت كلمة المرور؟{" "}
                <Link to="/login" className="text-primary font-semibold hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
