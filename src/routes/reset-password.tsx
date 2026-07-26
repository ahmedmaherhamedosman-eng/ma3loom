import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور — معلوم" },
      { name: "description", content: "أدخل كلمة المرور الجديدة" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check hash for recovery token
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => navigate({ to: "/profile" }), 2000);
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            <h1 className="text-xl font-bold text-foreground mb-2">رابط غير صالح</h1>
            <p className="text-muted-foreground text-sm mb-4">يبدو أن رابط الاستعادة غير صالح أو منتهي الصلاحية.</p>
            <Link to="/forgot-password" className="text-primary font-semibold hover:underline">
              اطلب رابط جديد
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-4">
              <img src="/logo.png" alt="معلوم" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">إعادة تعيين كلمة المرور</h1>
            <p className="text-sm text-muted-foreground mt-1">أدخل كلمة المرور الجديدة</p>
          </div>

          {success ? (
            <div className="text-center bg-primary/10 text-primary rounded-lg p-4">
              <p className="font-semibold">تم تغيير كلمة المرور بنجاح ✅</p>
              <p className="text-sm mt-1">جاري تحويلك...</p>
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
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                    minLength={6}
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                  {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
