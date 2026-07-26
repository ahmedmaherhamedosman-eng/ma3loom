import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — معلوم" },
      { name: "description", content: "تواصل مع فريق معلوم. نحن هنا لمساعدتك في أي استفسار." },
      { property: "og:title", content: "تواصل معنا — معلوم" },
      { property: "og:description", content: "تواصل مع فريق معلوم." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            تواصل معنا
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            عندك سؤال أو اقتراح؟ فريق معلوم موجود لمساعدتك
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Form */}
          <div className="bg-card rounded-2xl border border-border p-8">
            <h2 className="text-xl font-bold text-card-foreground mb-6">أرسل لنا رسالة</h2>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الاسم الكامل</label>
                <input
                  type="text"
                  className="w-full h-11 rounded-lg border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="أدخل اسمك"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  className="w-full h-11 rounded-lg border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الموضوع</label>
                <select className="w-full h-11 rounded-lg border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>استفسار عام</option>
                  <option>مشكلة تقنية</option>
                  <option>اقتراح تحسين</option>
                  <option>التسجيل كمعلم</option>
                  <option>شراكة أو تعاون</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الرسالة</label>
                <textarea
                  rows={5}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="اكتب رسالتك هنا..."
                />
              </div>
              <Button variant="hero" size="lg" className="w-full">إرسال الرسالة</Button>
            </form>
          </div>

          {/* Info */}
          <div className="space-y-8">
            <div className="gradient-hero rounded-2xl p-8 text-primary-foreground">
              <h2 className="text-xl font-bold mb-4">معلومات التواصل</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <div>
                    <p className="font-medium">البريد الإلكتروني</p>
                    <p className="text-primary-foreground/80 text-sm" dir="ltr">info@ma3loom.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  <div>
                    <p className="font-medium">الموقع</p>
                    <p className="text-primary-foreground/80 text-sm">الوطن العربي — نعمل عن بُعد</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8">
              <h3 className="text-lg font-bold text-card-foreground mb-4">أسئلة شائعة</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-foreground text-sm">هل الكورسات مجانية؟</p>
                  <p className="text-muted-foreground text-sm mt-1">نوفر كورسات مجانية ومدفوعة. يمكنك البدء بالكورسات المجانية.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">كيف أسجل كمعلم؟</p>
                  <p className="text-muted-foreground text-sm mt-1">تواصل معنا عبر النموذج واختر "التسجيل كمعلم" وسنتواصل معك.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">هل تدعمون الدفع المحلي؟</p>
                  <p className="text-muted-foreground text-sm mt-1">نعم، ندعم فودافون كاش وباي بال والتحويل البنكي.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
