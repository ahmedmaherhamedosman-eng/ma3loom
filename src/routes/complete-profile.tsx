import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARAB_COUNTRIES, getCountryByCode } from "@/lib/arab-countries";

export const Route = createFileRoute("/complete-profile")({
  head: () => ({
    meta: [
      { title: "استكمال البيانات — معلوم" },
      { name: "description", content: "أكمل بيانات حسابك للاستفادة الكاملة من المنصة" },
    ],
  }),
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState("student");
  const [age, setAge] = useState("");
  const [countryCode, setCountryCode] = useState("SA");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const country = useMemo(() => getCountryByCode(countryCode)!, [countryCode]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/login", search: { redirect: "/complete-profile" } });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, user_type, age, phone, country")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        // Pre-fill from existing data + Google metadata
        const metaName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";
        setFullName(profile.full_name || metaName);
        setUserType(profile.user_type || "student");
        if (profile.age) setAge(String(profile.age));
        if (profile.country) setCountryCode(profile.country);
        if (profile.phone) {
          // Strip dial code prefix if present
          const c = getCountryByCode(profile.country || "SA");
          if (c && profile.phone.startsWith(c.dialCode)) {
            setPhone(profile.phone.slice(c.dialCode.length));
          } else {
            setPhone(profile.phone);
          }
        }

        // If profile is already complete, redirect away
        if (profile.full_name && profile.age && profile.phone && profile.country) {
          navigate({ to: "/profile" });
          return;
        }
      }
      setChecking(false);
    })();
  }, [navigate]);

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate({ to: "/login", search: {} });
      return;
    }

    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        user_type: userType,
        age: ageNum,
        phone: fullPhone,
        country: country.code,
      })
      .eq("user_id", user.id);

    if (upErr) {
      setError(upErr.message);
      setLoading(false);
      return;
    }

    navigate({ to: "/profile" });
  };

  if (checking) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
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
            <h1 className="text-2xl font-bold text-foreground">استكمال البيانات</h1>
            <p className="text-sm text-muted-foreground mt-1">
              أكمل بياناتك للاستفادة الكاملة من المنصة
            </p>
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

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ ومتابعة"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
