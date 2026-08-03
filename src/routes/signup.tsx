import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARAB_COUNTRIES, getCountryByCode } from "@/lib/arab-countries";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "إنشاء حساب جديد — معلوم" },
      { name: "description", content: "سجّل حساب جديد في منصة معلوم التعليمية" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("student");
  const [age, setAge] = useState("");
  const [countryCode, setCountryCode] = useState("SA");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const country = useMemo(() => getCountryByCode(countryCode)!, [countryCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (fullName.trim().length < 2) {
      setError("الاسم قصير جداً");
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 5 || ageNum > 100) {
      setError("الرجاء إدخال سن صحيح بين 5 و 100");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 6 || cleanPhone.length > 15) {
      setError("الرجاء إدخال رقم جوال صحيح");
      return;
    }

    const fullPhone = `${country.dialCode}${cleanPhone.replace(/^0+/, "")}`;

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_type: userType,
          age: age,
          phone: fullPhone,
          country: country.code,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">تم إنشاء الحساب بنجاح!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            تم إرسال رابط تأكيد لبريدك الإلكتروني. افتح الرابط لتفعيل حسابك.
          </p>
          <Link to="/login" search={{ redirect: undefined }}>
            <Button variant="hero" size="lg">تسجيل الدخول</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 rounded-xl gradient-hero flex items-center justify-center mb-4">
              <img src="/logo.png" alt="معلوم" className="h-10 w-10 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">إنشاء حساب جديد</h1>
            <p className="text-sm text-muted-foreground mt-1">سجّل الآن وابدأ رحلتك التعليمية</p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="أدخل اسمك الكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">نوع الحساب</Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">طالب</SelectItem>
                  <SelectItem value="teacher">معلم</SelectItem>
                  <SelectItem value="parent">ولي أمر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">الدولة</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {ARAB_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                        <span className="text-muted-foreground text-xs" dir="ltr">({c.dialCode})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age">السن</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="مثال: 18"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  min={5}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الجوال</Label>
                <div className="flex gap-2" dir="ltr">
                  <div className="flex items-center justify-center px-3 rounded-md border border-input bg-muted text-sm font-medium whitespace-nowrap">
                    {country.dialCode}
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="5xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left flex-1"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>

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
                placeholder="٦ أحرف على الأقل"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                className="text-left"
                minLength={6}
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "جاري إنشاء الحساب..." : "سجّل الآن"}
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

          <p className="text-center text-sm text-muted-foreground mt-6">
            عندك حساب بالفعل؟{" "}
            <Link to="/login" search={{ redirect: undefined }} className="text-primary font-semibold hover:underline">
              سجّل دخولك
            </Link>
          </p>
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
