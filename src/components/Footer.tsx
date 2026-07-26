import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/95 p-1">
                <img src="/logo.png" alt="معلوم" className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold">معلوم</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              منصة تعليمية عربية متكاملة تهدف لتمكين الطلاب في الوطن العربي من التعلم بسهولة وفعالية.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/" className="hover:text-primary-foreground transition-colors">الرئيسية</Link></li>
              <li><Link to="/courses" className="hover:text-primary-foreground transition-colors">الكورسات</Link></li>
              <li><Link to="/about" className="hover:text-primary-foreground transition-colors">عن معلوم</Link></li>
              <li><Link to="/contact" className="hover:text-primary-foreground transition-colors">تواصل معنا</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">التخصصات</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>العلوم</li>
              <li>الرياضيات</li>
              <li>اللغات</li>
              <li>البرمجة</li>
              <li>المهارات</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>info@ma3loom.com</li>
              <li>الوطن العربي</li>
            </ul>
            <h4 className="font-semibold mt-6 mb-4">قانوني</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/privacy" className="hover:text-primary-foreground transition-colors">سياسة الخصوصية</Link></li>
              <li><Link to="/terms" className="hover:text-primary-foreground transition-colors">الشروط والأحكام</Link></li>
              <li><Link to="/refund" className="hover:text-primary-foreground transition-colors">سياسة الاسترجاع</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-center text-sm text-primary-foreground/50">
          <p>© {new Date().getFullYear()} ma3loom website — جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  );
}
