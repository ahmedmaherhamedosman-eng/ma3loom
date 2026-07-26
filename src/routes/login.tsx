import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = typeof search.redirect === "string" ? search.redirect : undefined;
    return redirect ? { redirect } : {};
  },
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — معلوم" },
      { name: "description", content: "سجّل دخولك لمنصة معلوم التعليمية" },
    ],
  }),
  component: LoginPage,
});

async function isProfileComplete(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, age, phone, country")
    .eq("user_id", userId)
    .maybeSingle();
  return !!(data && data.full_name && data.age && data.phone && data.country);
}

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const redirectTo = redirect || "/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        : error.message);
      setLoading(false);
      return;
    }

    if (data.user && !(await isProfileComplete(data.user.id))) {
      navigate({ to: "/complete-profile" });
      return;
    }

    navigate({ to: redirectTo as any });
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/complete-profile`,
    });
    if (result.error) {
      setError("فشل تسجيل الدخول بجوجل، حاول مرة أخرى");
      setGoogleLoading(false);
      return;
    }
    if (result.redirected) return;

    // Tokens received synchronously - check profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !(await isProfileComplete(user.id))) {
      navigate({ to: "/complete-profile" });
    } else {
      navigate({ to: redirectTo as any });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-4">
              <img src="/logo.png" alt="معلوم" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">تسجيل الدخول</h1>
            <p className="text-sm text-muted-foreground mt-1">أدخل بياناتك للدخول لحسابك</p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-6 text-center">
              {error}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full mb-4"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="ml-2">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "جاري التحويل..." : "تسجيل الدخول بحساب جوجل"}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">أو</span>
            </div>
          </div>

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

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
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

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading || googleLoading}>
              {loading ? "جاري تسجيل الدخول..." : "دخول"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground mt-6 space-y-2">
            <Link to="/forgot-password" className="text-primary font-semibold hover:underline block">
              نسيت كلمة المرور؟
            </Link>
            <p>
              ما عندكش حساب؟{" "}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                سجّل الآن
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
