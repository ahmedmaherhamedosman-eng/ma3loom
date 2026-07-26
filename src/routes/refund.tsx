import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "سياسة الاسترجاع — معلوم" },
      { name: "description", content: "سياسة استرجاع المدفوعات لمنصة معلوم التعليمية — ضمان استرجاع خلال ٣٠ يوماً." },
      { property: "og:title", content: "سياسة الاسترجاع — معلوم" },
      { property: "og:description", content: "ضمان استرجاع المبلغ خلال ٣٠ يوماً من تاريخ الشراء." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-foreground mb-2">سياسة الاسترجاع</h1>
      <p className="text-sm text-muted-foreground mb-8">آخر تحديث: {new Date().toLocaleDateString("ar-EG")}</p>

      <div className="space-y-8 text-foreground">
        <section className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <h2 className="text-2xl font-bold mb-3 text-primary">ضمان استرجاع لمدة ٣٠ يوماً</h2>
          <p className="text-foreground leading-relaxed">
            في <strong>ma3loom website</strong> نريد أن تكون راضياً تماماً عن تجربتك التعليمية. إذا لم تكن راضياً عن
            مشترياتك، يمكنك طلب استرجاع كامل للمبلغ خلال <strong>٣٠ يوماً</strong> من تاريخ الشراء.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">١. مدة الاسترجاع</h2>
          <p className="text-muted-foreground leading-relaxed">
            يحق لك طلب استرجاع كامل خلال <strong>٣٠ يوماً</strong> من تاريخ الطلب لأي سبب كان (تغيير الرأي، عدم الرضا، إلخ).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٢. كيفية طلب الاسترجاع</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            تتم معالجة جميع عمليات الاسترجاع بواسطة موفّر الدفع <strong>Stripe</strong>. لطلب الاسترجاع:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              راسلنا مباشرة على: <a href="mailto:info@ma3loom.com" className="text-primary hover:underline">info@ma3loom.com</a>
              {" "}من نفس البريد الإلكتروني المُستخدَم في الشراء، مع ذكر اسم الكورس وتاريخ الشراء.
            </li>
            <li>
              سنراجع طلبك خلال ٢٤–٤٨ ساعة ونتواصل معك لإتمام الاسترجاع.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٣. مدة معالجة الاسترجاع</h2>
          <p className="text-muted-foreground leading-relaxed">
            بعد الموافقة على طلب الاسترجاع، تتم إعادة المبلغ إلى وسيلة الدفع الأصلية عادةً خلال <strong>٥–١٠ أيام عمل</strong>،
            وقد تختلف المدة حسب البنك أو مزوّد الدفع.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٥. التواصل</h2>
          <p className="text-muted-foreground leading-relaxed">
            أي استفسار بخصوص الاسترجاع: <a href="mailto:info@ma3loom.com" className="text-primary hover:underline">info@ma3loom.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
