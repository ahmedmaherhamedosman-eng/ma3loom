import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — معلوم" },
      { name: "description", content: "سياسة الخصوصية لمنصة معلوم التعليمية — كيف نجمع ونستخدم ونحمي بياناتك الشخصية." },
      { property: "og:title", content: "سياسة الخصوصية — معلوم" },
      { property: "og:description", content: "سياسة الخصوصية لمنصة معلوم التعليمية." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-foreground mb-2">سياسة الخصوصية</h1>
      <p className="text-sm text-muted-foreground mb-8">آخر تحديث: {new Date().toLocaleDateString("ar-EG")}</p>

      <div className="prose prose-lg max-w-none space-y-8 text-foreground">
        <section>
          <h2 className="text-2xl font-bold mb-3">١. من نحن</h2>
          <p className="text-muted-foreground leading-relaxed">
            تُدار منصة معلوم بواسطة <strong>ma3loom website</strong> (المُشار إليها بـ "نحن" أو "معلوم"). نحن نعمل بصفتنا
            مراقباً للبيانات (Data Controller) للمعلومات الشخصية التي نجمعها منك عند استخدام خدماتنا التعليمية.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٢. البيانات التي نجمعها</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>بيانات الحساب:</strong> الاسم الكامل، البريد الإلكتروني، رقم الهاتف، العمر، المرحلة التعليمية.</li>
            <li><strong>بيانات الاستخدام:</strong> الكورسات المُسجَّل بها، التقدم، نتائج الاختبارات، الشهادات.</li>
            <li><strong>البيانات التقنية:</strong> عنوان IP، نوع المتصفح، الجهاز، سجلات الدخول.</li>
            <li><strong>بيانات التواصل:</strong> رسائل الدعم الفني والاستفسارات.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٣. أغراض المعالجة والأساس القانوني</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>تنفيذ العقد:</strong> إنشاء حسابك، تقديم الكورسات، إصدار الشهادات.</li>
            <li><strong>المصالح المشروعة:</strong> تحسين المنصة، منع الاحتيال، الأمان.</li>
            <li><strong>الموافقة:</strong> إرسال رسائل تسويقية (يمكنك إلغاء الاشتراك في أي وقت).</li>
            <li><strong>الالتزام القانوني:</strong> الاحتفاظ بالسجلات الضريبية والمحاسبية.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٤. مشاركة البيانات</h2>
          <p className="text-muted-foreground leading-relaxed mb-3">قد نشارك بياناتك مع:</p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>مزوّدي الخدمة:</strong> استضافة، تحليلات، أدوات الدعم الفني.</li>
            <li>
              <strong>Stripe:</strong> لإتمام عمليات الدفع الإلكتروني بشكل آمن. تُطبَّق سياسة خصوصية Stripe
              على بيانات الدفع التي تعالجها.
            </li>
            <li><strong>المستشارون المهنيون:</strong> محامون، محاسبون عند الضرورة.</li>
            <li><strong>السلطات المختصة:</strong> عند طلبها قانونياً.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٥. مدة الاحتفاظ بالبيانات</h2>
          <p className="text-muted-foreground leading-relaxed">
            نحتفظ ببياناتك طوال فترة نشاط حسابك ولمدة لا تزيد عن ٧ سنوات بعد إغلاق الحساب للأغراض القانونية والمحاسبية،
            ثم نقوم بحذفها أو إخفاء هويتها بشكل دائم.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٦. حقوقك</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>الوصول إلى بياناتك والحصول على نسخة منها.</li>
            <li>تصحيح أو تحديث البيانات غير الدقيقة.</li>
            <li>حذف بياناتك (الحق في النسيان).</li>
            <li>تقييد المعالجة أو الاعتراض عليها.</li>
            <li>سحب الموافقة في أي وقت.</li>
            <li>تقديم شكوى لدى السلطة المختصة بحماية البيانات.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            لممارسة أي من هذه الحقوق، تواصل معنا على: <a href="mailto:info@ma3loom.com" className="text-primary hover:underline">info@ma3loom.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٧. الأمان</h2>
          <p className="text-muted-foreground leading-relaxed">
            نطبّق إجراءات تقنية وتنظيمية مناسبة (التشفير، ضوابط الوصول، المراقبة) لحماية بياناتك من الفقد أو
            الاستخدام غير المصرح به.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٨. ملفات تعريف الارتباط (Cookies)</h2>
          <p className="text-muted-foreground leading-relaxed">
            نستخدم ملفات تعريف الارتباط الأساسية لتشغيل المنصة (تسجيل الدخول، السلة)، وملفات تحليلية لفهم كيفية
            استخدام الموقع وتحسينه. يمكنك إدارة تفضيلاتك من إعدادات المتصفح.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-3">٩. التواصل</h2>
          <p className="text-muted-foreground leading-relaxed">
            لأي استفسار حول هذه السياسة: <a href="mailto:info@ma3loom.com" className="text-primary hover:underline">info@ma3loom.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
