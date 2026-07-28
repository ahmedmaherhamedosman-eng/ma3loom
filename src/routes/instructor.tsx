import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useInstructor } from "@/hooks/useInstructor";
import { useAdmin } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/instructor")({
  component: InstructorLayout,
});

const sidebarLinks = [
  { to: "/instructor/live", label: "حصصي المباشرة", icon: "🔴" },
  { to: "/instructor/private-lessons", label: "إدارة الحصص", icon: "🗓️" },
];

function InstructorLayout() {
  const { isInstructor, isLoading } = useInstructor();
  const { isAdmin } = useAdmin();
  const location = useLocation();

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

  if (!isInstructor && !isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center bg-card rounded-2xl border border-border p-8 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">صفحة المدرسين</h1>
          <p className="text-muted-foreground text-sm mb-6">
            يجب أن تكون مدرساً للوصول لهذه الصفحة. تواصل مع الإدارة لتفعيل حسابك كمدرس.
          </p>
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex">
      <aside className="w-64 bg-card border-e border-border p-4 hidden md:block">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">لوحة المدرس</h2>
          <p className="text-xs text-muted-foreground">إدارة حصصك على معلوم</p>
        </div>
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
