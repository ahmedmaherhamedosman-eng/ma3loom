import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن معلوم — منصة تعليمية عربية" },
      { name: "description", content: "تعرف على منصة معلوم ورؤيتنا لتطوير التعليم في الوطن العربي." },
      { property: "og:title", content: "عن معلوم — منصة تعليمية عربية" },
      { property: "og:description", content: "تعرف على رؤية معلوم ومهمتنا." },
    ],
  }),
  component: AboutPage,
});

const values = [
  { title: "الجودة", description: "نلتزم بتقديم محتوى تعليمي عالي الجودة يراجعه خبراء متخصصون", icon: "⭐" },
  { title: "الشمولية", description: "نوفر التعليم لجميع الطلاب بغض النظر عن مستواهم المادي أو الجغرافي", icon: "🌍" },
  { title: "الابتكار", description: "نستخدم أحدث تقنيات التعليم الإلكتروني لضمان أفضل تجربة", icon: "💡" },
  { title: "التفاعل", description: "نؤمن بأن التعلم التفاعلي هو مفتاح الفهم العميق والتميز", icon: "🤝" },
];

function AboutPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            عن <span className="text-gradient">معلوم</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
            معلوم هي منصة تعليمية عربية أُسست بهدف تمكين كل طالب في الوطن العربي من الحصول على تعليم عالي الجودة بسهولة ويسر. نؤمن أن التعليم حق للجميع وأن التكنولوجيا يمكن أن تكون الجسر لتحقيق ذلك.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="gradient-hero rounded-2xl p-8 text-primary-foreground">
            <h2 className="text-2xl font-bold mb-4">رؤيتنا</h2>
            <p className="text-primary-foreground/85 leading-relaxed">
              أن تصبح معلوم المنصة التعليمية الأولى في الوطن العربي، حيث يجد كل طالب ما يحتاجه من محتوى تعليمي عالي الجودة باللغة العربية.
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-8">
            <h2 className="text-2xl font-bold text-card-foreground mb-4">مهمتنا</h2>
            <p className="text-muted-foreground leading-relaxed">
              تقديم تجربة تعليمية متكاملة تجمع بين المحتوى المتميز، الاختبارات التفاعلية، والشهادات المعتمدة، مع واجهة سهلة الاستخدام تناسب جميع المراحل التعليمية.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground text-center mb-12">قيمنا</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-card rounded-2xl border border-border p-6 text-center card-hover">
                <span className="text-4xl mb-4 block">{value.icon}</span>
                <h3 className="text-lg font-bold text-card-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Target */}
        <div className="bg-muted/50 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">من نستهدف؟</h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-sm">١</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">طلاب المرحلة الإعدادية</h3>
                <p className="text-sm text-muted-foreground">من الصف الأول حتى الثالث الإعدادي</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-sm">٢</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">طلاب المرحلة الثانوية</h3>
                <p className="text-sm text-muted-foreground">جميع الشعب والتخصصات</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-sm">٣</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">طلاب الجامعات</h3>
                <p className="text-sm text-muted-foreground">كل التخصصات الأكاديمية</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg gradient-warm flex items-center justify-center shrink-0">
                <span className="text-warm-foreground font-bold text-sm">٤</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">المعلمون</h3>
                <p className="text-sm text-muted-foreground">الراغبون في نشر محتواهم التعليمي</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
