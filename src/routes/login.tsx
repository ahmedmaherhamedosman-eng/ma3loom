import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = typeof search.redirect === "string" && search.redirect.startsWith("/")
      ? search.redirect
      : undefined;
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
  const redirectTo = redirect && redirect !== "/login" ? redirect : "/profile";
  const goToRedirect = useCallback(() => {
    window.location.assign(redirectTo);
  }, [redirectTo]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!mounted || !user) return;

      if (!(await isProfileComplete(user.id))) {
        navigate({ to: "/complete-profile" });
        return;
      }

      goToRedirect();
    };

    void checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [navigate, goToRedirect]);

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

    goToRedirect();
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
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

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "جاري تسجيل الدخول..." : "دخول"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">أو</span></div>
          </div>

          <Button type="button" variant="outline" size="lg" className="w-full gap-3" disabled={loading} onClick={handleGoogleSignIn}>
            <GoogleIcon />
            المتابعة باستخدام Google
          </Button>

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.79h3.14c1.84-1.7 2.92-4.2 2.92-7.75Z" />
      <path fill="#34A853" d="M12 21.76c2.62 0 4.81-.87 6.42-2.36l-3.14-2.79c-.87.58-1.98.92-3.28.92-2.52 0-4.66-1.7-5.42-3.99H3.34v2.88A9.7 9.7 0 0 0 12 21.76Z" />
      <path fill="#FBBC05" d="M6.58 13.54A5.8 5.8 0 0 1 6.28 12c0-.53.1-1.04.3-1.54V7.58H3.34A9.7 9.7 0 0 0 2.3 12c0 1.57.38 3.06 1.04 4.42l3.24-2.88Z" />
      <path fill="#EA4335" d="M12 6.47c1.42 0 2.69.49 3.69 1.44l2.77-2.77C16.8 3.58 14.62 2.24 12 2.24a9.7 9.7 0 0 0-8.66 5.34l3.24 2.88C7.34 8.17 9.48 6.47 12 6.47Z" />
    </svg>
  );
}
