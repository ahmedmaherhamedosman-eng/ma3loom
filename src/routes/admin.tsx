import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useAdmin } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminNotificationsBell } from "@/components/admin/AdminNotificationsBell";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const sidebarLinks: { to: string; label: string; icon: string; exact?: boolean }[] = [
  { to: "/admin", label: "الإحصائيات", icon: "📊", exact: true },
  { to: "/admin/courses", label: "الكورسات", icon: "📚" },
  { to: "/admin/quizzes", label: "اختبارات MCQ", icon: "📝" },
  { to: "/admin/html-quizzes", label: "اختبارات HTML", icon: "🧩" },
  { to: "/admin/lesson-requests", label: "طلبات الحصص", icon: "📨" },
  { to: "/admin/categories", label: "التصنيفات", icon: "🏷️" },
  { to: "/admin/students", label: "الطلاب", icon: "👨‍🎓" },
  { to: "/admin/reviews", label: "التقييمات", icon: "⭐" },
  { to: "/admin/payments", label: "المدفوعات", icon: "💳" },
  { to: "/admin/posts", label: "المنشورات", icon: "📝" },
  { to: "/admin/live", label: "الحصص المباشرة", icon: "🔴" },
  { to: "/admin/instructors", label: "المدرسون", icon: "👨‍🏫" },
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
      <aside className="w-64 bg-card border-e border-border p-4 hidden md:block">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground">لوحة التحكم</h2>
            <p className="text-xs text-muted-foreground">إدارة منصة معلوم</p>
          </div>
          {!isMobile && <AdminNotificationsBell />}
        </div>
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = link.exact
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-50 px-2 py-1">
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
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pb-20 md:pb-8">
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
