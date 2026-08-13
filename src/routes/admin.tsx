import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useAdmin } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminNotificationsBell } from "@/components/admin/AdminNotificationsBell";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const sidebarLinks: { to: string; label: string; icon: string; exact?: boolean }[] = [
  { to: "/admin/private-lessons", label: "إدارة الحصص الخصوصية", icon: "🎯" },
  { to: "/admin", label: "الإحصائيات", icon: "📊", exact: true },
  { to: "/admin/courses", label: "الكورسات", icon: "📚" },
  { to: "/admin/quizzes", label: "اختبارات MCQ", icon: "📝" },
  { to: "/admin/html-quizzes", label: "اختبارات HTML", icon: "🧩" },
  { to: "/admin/lesson-requests", label: "طلبات الحصص", icon: "📨" },
  { to: "/admin/categories", label: "التصنيفات", icon: "🏷️" },
  { to: "/admin/students", label: "الطلاب", icon: "👨‍🎓" },
  { to: "/admin/reviews", label: "التقييمات", icon: "⭐" },
  { to: "/admin/payments", label: "المدفوعات", icon: "💳" },
  { to: "/admin/posts", label: "المدونة", icon: "📝" },
  { to: "/admin/live", label: "الحصص المباشرة", icon: "🔴" },
  { to: "/admin/teachers", label: "المعلمون", icon: "👨‍🏫" },
  { to: "/admin/games", label: "الألعاب التعليمية", icon: "🎮" },
  { to: "/admin/books", label: "الكتب", icon: "📚" },
  { to: "/admin/coupons", label: "الكوبونات", icon: "🎟️" },
];

function AdminLayout() {
  const { isAdmin, isLoading } = useAdmin();
  const location = useLocation();
  const isMobile = useIsMobile();


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center bg-card rounded-2xl border border-border p-8 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">غير مصرح لك</h1>
          <p className="text-muted-foreground text-sm mb-6">
            هذه الصفحة للمدير فقط. سجّل دخولك بحساب المدير.
          </p>
          <Link to="/login" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex">
      {/* Sidebar */}
      <aside className="w-72 border-e border-border/70 bg-card/80 p-4 hidden md:block backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between gap-2 rounded-2xl gradient-hero p-4 text-primary-foreground shadow-elevated">
          <div>
            <h2 className="text-lg font-extrabold">لوحة التحكم</h2>
            <p className="text-xs text-primary-foreground/75">إدارة منصة معلوم</p>
          </div>
          {!isMobile && <AdminNotificationsBell />}
        </div>
        <nav className="space-y-1.5">
          {sidebarLinks.map((link) => {
            const isActive = link.exact
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:translate-x-0.5"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-xl border-t border-border/80 z-50 px-2 py-1 shadow-[0_-10px_30px_rgb(15_23_42_/_0.08)]">
        <div className="flex justify-around">
          {sidebarLinks.slice(0, 5).map((link) => {
            const isActive = link.exact
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span className="truncate max-w-[60px]">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 bg-gradient-to-b from-background via-background to-primary/[0.025] p-4 sm:p-6 lg:p-8 overflow-auto pb-20 md:pb-8">
        {isMobile && (
          <div className="flex justify-end mb-3">
            <AdminNotificationsBell />
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
