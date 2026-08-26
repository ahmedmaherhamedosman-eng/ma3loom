import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/hooks/useCart";
import { SelectedPackageProvider } from '@/context/SelectedPackageContext'
import { Toaster } from "@/components/ui/sonner";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { WhatsAppButton } from "@/components/WhatsAppButton";

import appCss from "../styles.css?url";
import indexCss from "../../index.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">٤٠٤</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          الصفحة غير موجودة
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة اللي بتدور عليها مش موجودة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "معلوم — منصة تعليمية عربية متكاملة" },
      { name: "description", content: "منصة معلوم التعليمية للطلاب العرب. كورسات في العلوم والرياضيات واللغات والبرمجة." },
      { name: "keywords", content: "معلوم, منصة معلوم, معلوم التعليمية, منصة معلوم التعليمية, منصة تعليمية, منصة تعليمية عربية, منصة تعليمية أونلاين, منصة تعليم إلكتروني, التعليم عن بعد, التعليم الإلكتروني, تعليم أونلاين, تعلم أونلاين, التعلم الذاتي, كورسات أونلاين, دورات تدريبية أونلاين, دورات تعليمية عربية, كورسات عربية, دروس أونلاين, دروس تعليمية, دروس للطلاب, شرح مبسط, تعليم الطلاب, تعليم الأطفال, تعليم المراهقين, تعليم لكل المراحل, مدرسين أونلاين, مدرسين عرب, معلمين أونلاين, أفضل المعلمين, مدرس خصوصي أونلاين, حجز مدرس خصوصي, دروس خصوصية أونلاين, حصص خصوصية, حصص مباشرة أونلاين, فصول افتراضية, محاضرات مباشرة, مراجعة دراسية, مساعدة دراسية, مذاكرة أونلاين, تحفيظ القرآن أونلاين, تعليم القرآن والتجويد, رياضيات, علوم, فيزياء, كيمياء, أحياء, لغة عربية, لغة إنجليزية, لغات, برمجة, تصميم, مهارات رقمية, اختبارات تفاعلية, امتحانات أونلاين, تقييم مستوى, ألعاب تعليمية, تعلم باللعب, كتب إلكترونية تعليمية, شهادات إتمام, شهادات تعليمية, كورسات مجانية, كورسات مدفوعة, Maaloom, Ma3loom, Maaloom educational platform, Arabic educational platform, online learning platform, e-learning platform, online education, distance learning, online courses, Arabic courses, online lessons, lessons for students, online teachers, Arabic teachers, private tutor online, online private lessons, live online classes, virtual classroom, Quran memorization online, Quran and Tajweed lessons, math courses, science courses, physics, chemistry, biology, Arabic language, English language, programming courses, digital skills, interactive quizzes, online exams, educational games, e-learning certificates, free online courses" },
      { name: "google-site-verification", content: "haC_-73Xv8d5r3WuOTpxe7rNk1CjwYueOVGJUxChut8" },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "معلوم" },
      { property: "og:title", content: "معلوم — منصة تعليمية عربية متكاملة" },
      { property: "og:description", content: "منصة معلوم التعليمية للطلاب العرب. كورسات في العلوم والرياضيات واللغات والبرمجة." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "معلوم" },
      { property: "og:locale", content: "ar_AR" },
      { property: "og:image", content: "https://ma3loom.vercel.app/logo.png" },
      { name: "twitter:title", content: "معلوم — منصة تعليمية عربية متكاملة" },
      { name: "twitter:description", content: "منصة معلوم التعليمية للطلاب العرب. كورسات في العلوم والرياضيات واللغات والبرمجة." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "https://ma3loom-ma3loom.vercel.app/logo.png" },
    ],
    links: [
      { rel: "stylesheet", href: indexCss },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/logo.png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <CartProvider>
      <SelectedPackageProvider>
      <PaymentTestModeBanner />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <Toaster position="top-center" richColors />
      </SelectedPackageProvider>
    </CartProvider>
  );
}
