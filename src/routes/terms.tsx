import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام — معلوم" },
      { name: "description", content: "الشروط والأحكام الخاصة باستخدام منصة معلوم التعليمية." },
      { property: "og:title", content: "الشروط والأحكام — معلوم" },
      { property: "og:description", content: "الشروط والأحكام الخاصة باستخدام منصة معلوم التعليمية." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-foreground mb-2">الشروط والأحكام</h1>
      <p className="text-sm text-muted-foreground mb-8">آخر تحديث: {new Date().toLocaleDateString("ar-EG")}</p>

      <div className="space-y-8 text-foreground">
        <section>
          <h2 className="text-2xl font-bold mb-3">١. البائع والتعريفات</h2>
          <p className="text-muted-foreground leading-relaxed">
            هذه الشروط والأحكام تحكم استخدامك لمنصة معلوم التعليمية المُدارة بواسطة <strong>ma3loom website</strong>
            (المُشار إليها بـ "معلوم" أو "نحن"). باستخدامك للمنصة فإنك تتعاقد مباشرة مع ma3loom website.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٢. القبول</h2>
          <p className="text-muted-foreground leading-relaxed">
            باستمرار استخدامك لخدمات معلوم، فأنت توافق على الالتزام بهذه الشروط. إذا لم توافق، يرجى التوقف عن استخدام المنصة.
            يجب أن تكون في السن القانونية أو لديك إذن من ولي الأمر لاستخدام المنصة.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٣. وصف الخدمة</h2>
          <p className="text-muted-foreground leading-relaxed">
            توفر معلوم منصة تعليمية إلكترونية تشمل كورسات، دروس مرئية، اختبارات، شهادات، وجلسات حية للطلاب في الوطن العربي.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٤. الحساب وبيانات الدخول</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>أنت مسؤول عن سرية بيانات الدخول الخاصة بك.</li>
            <li>يجب تقديم معلومات دقيقة وتحديثها عند الحاجة.</li>
            <li>أنت مسؤول عن جميع الأنشطة التي تتم تحت حسابك.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٥. الاستخدامات المحظورة</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">يُحظر عليك:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>استخدام المنصة لأي غرض غير قانوني أو احتيالي.</li>
            <li>إرسال رسائل مزعجة (Spam) أو محتوى ضار.</li>
            <li>انتهاك حقوق الملكية الفكرية لمعلوم أو الغير.</li>
            <li>محاولة اختراق الأمان أو التدخل في عمل المنصة (برامج خبيثة، فحص، استخراج بيانات).</li>
            <li>إعادة بيع أو توزيع الكورسات أو الدروس بأي شكل.</li>
            <li>الهندسة العكسية أو الالتفاف على القيود التقنية.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٦. الملكية الفكرية</h2>
          <p className="text-muted-foreground leading-relaxed">
            جميع المحتويات (الفيديوهات، الدروس، الاختبارات، التصاميم، الشعار، البرمجيات) هي ملك حصري لـ ma3loom website
            ومحمية بحقوق الملكية الفكرية. نمنحك ترخيصاً محدوداً غير حصري وغير قابل للنقل لاستخدام المحتوى المُشترك فيه شخصياً.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٧. المدفوعات</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            تتم معالجة الطلبات بواسطة موفّر الدفع <strong>Stripe</strong>. جميع المعاملات آمنة ومُشفّرة، ولا نقوم بتخزين بيانات بطاقتك على خوادمنا.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            الكورسات تُباع بنظام الدفعة الواحدة لكل كورس (ملكية دائمة). للاطلاع على سياسة الاسترجاع، راجع
            <a href="/refund" className="text-primary hover:underline mx-1">صفحة الاسترجاع</a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٨. مستوى الخدمة</h2>
          <p className="text-muted-foreground leading-relaxed">
            نسعى لتقديم خدمة مستقرة، لكننا لا نضمن أن تكون المنصة متاحة بدون انقطاع أو خالية من الأخطاء. قد نُجري
            صيانة دورية أو تحديثات قد تؤثر مؤقتاً على الوصول.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٩. التعليق والإنهاء</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">يحق لنا تعليق أو إنهاء حسابك في الحالات التالية:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>الإخلال الجوهري بهذه الشروط.</li>
            <li>عدم سداد المستحقات.</li>
            <li>وجود مخاطر أمنية أو احتيال.</li>
            <li>الانتهاكات المتكررة أو الجسيمة للسياسات.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">١٠. إخلاء المسؤولية وتحديدها</h2>
          <p className="text-muted-foreground leading-relaxed">
            نُخلي مسؤوليتنا — إلى أقصى حد يسمح به القانون — من جميع الضمانات الضمنية. مسؤوليتنا الإجمالية محدودة
            بالمبالغ التي دفعتها خلال الـ ١٢ شهراً السابقة. لا نتحمل أي أضرار غير مباشرة أو تبعية (فقدان أرباح،
            بيانات، أو سمعة)، باستثناء ما يفرضه القانون من مسؤولية عن الاحتيال أو الإصابة الشخصية.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">١١. التعويض</h2>
          <p className="text-muted-foreground leading-relaxed">
            توافق على تعويض ma3loom website عن أي مطالبات ناشئة عن استخدامك غير القانوني للمنصة أو انتهاكك لهذه الشروط.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">١٢. القانون الحاكم</h2>
          <p className="text-muted-foreground leading-relaxed">
            تخضع هذه الشروط لقوانين الولاية القضائية التي يقع فيها مقر ma3loom website، وأي نزاع يتم حله أمام المحاكم المختصة فيها.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">١٣. التعديلات</h2>
          <p className="text-muted-foreground leading-relaxed">
            قد نُحدّث هذه الشروط من وقت لآخر. التعديلات الجوهرية سيتم إخطارك بها عبر البريد الإلكتروني أو إشعار على المنصة.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">١٤. التواصل</h2>
          <p className="text-muted-foreground leading-relaxed">
            لأي استفسار: <a href="mailto:info@ma3loom.com" className="text-primary hover:underline">info@ma3loom.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
