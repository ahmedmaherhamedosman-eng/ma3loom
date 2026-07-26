import { Link, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useAdmin } from "@/hooks/useAdmin";
import { useInstructor } from "@/hooks/useInstructor";
import { useCart } from "@/hooks/useCart";

// Primary nav (always visible)
const primaryLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/courses", label: "الكورسات" },
  { to: "/live-classes", label: "حصص مباشرة" },
  { to: "/blog", label: "المدونة" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

// Secondary nav (inside "المزيد" dropdown)
const moreLinks = [
  { to: "/play", label: "🎮 ألعاب الأطفال" },
  { to: "/books", label: "📚 الكتب" },
  { to: "/games", label: "🕹️ ألعاب HTML" },
  { to: "/quizzes", label: "📝 اختبارات" },
  { to: "/categories", label: "🏷️ التصنيفات" },
  { to: "/tutoring", label: "👨‍🏫 حصص خصوصية" },
  { to: "/about", label: "ℹ️ عن معلوم" },
] as const;

const navLinks = [...primaryLinks, ...moreLinks] as const;

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const { isInstructor } = useInstructor();
  const { count: cartCount } = useCart();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 group" aria-label="معلوم">
            <img
              src="/logo.png"
              alt="معلوم"
              className="h-10 w-10 sm:h-14 sm:w-14 md:h-20 md:w-20 object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {primaryLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    moreLinks.some((l) => l.to === location.pathname)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  المزيد
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                {moreLinks.map((link) => (
                  <DropdownMenuItem key={link.to} asChild>
                    <Link
                      to={link.to}
                      className={`cursor-pointer ${
                        location.pathname === link.to ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <Link to="/cart" className="relative p-2 rounded-lg hover:bg-muted transition-colors" title="سلة الشراء">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -end-1 bg-warm text-warm-foreground text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">لوحتي</Button>
                </Link>
                <Link to="/my-courses">
                  <Button variant="ghost" size="sm">كورساتي</Button>
                </Link>
                <Link to="/certificates">
                  <Button variant="ghost" size="sm">🏅 شهاداتي</Button>
                </Link>
                {isInstructor && !isAdmin && (
                  <Link to="/instructor/live">
                    <Button variant="outline" size="sm">لوحة المدرس</Button>
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm">لوحة التحكم</Button>
                  </Link>
                )}
                <Link to="/profile">
                  <Button variant="hero" size="sm">ملفي الشخصي</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">دخول</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="hero" size="sm">سجّل مجاناً</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted"
            aria-label="القائمة"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-border pt-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                  location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted/50">
                  🏠 لوحتي
                </Link>
                <Link to="/my-courses" onClick={() => setMobileOpen(false)} className="block px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted/50">
                  📚 كورساتي
                </Link>
                <Link to="/certificates" onClick={() => setMobileOpen(false)} className="block px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted/50">
                  🏅 شهاداتي
                </Link>
                <Link to="/cart" onClick={() => setMobileOpen(false)} className="block px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted/50">
                  🛒 سلة الشراء {cartCount > 0 && <span className="text-xs bg-warm text-warm-foreground rounded-full px-2 py-0.5 ms-2">{cartCount}</span>}
                </Link>
              </>
            )}
            <div className="flex gap-2 pt-2 px-4">
              {user ? (
                <Link to="/profile" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="hero" size="sm" className="w-full">ملفي الشخصي</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full">دخول</Button>
                  </Link>
                  <Link to="/signup" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="hero" size="sm" className="w-full">سجّل مجاناً</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
