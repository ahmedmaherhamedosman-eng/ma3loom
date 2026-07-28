import { createFileRoute, Link } from '@tanstack/react-router'
import { 
  CheckCircle2, Star, Clock, Calendar, BookOpen, 
  UserCheck, Award, MessageSquare, ShieldCheck, ArrowRight, Sparkles, HelpCircle, Users, Check
} from 'lucide-react'

export const Route = createFileRoute('/private-lessons')({
  component: PrivateLessonsPage,
})

function PrivateLessonsPage() {
  const packages = [
    {
      slug: 'single-lesson',
      title: 'الحصة المفردة',
      badge: '🟢 مرونة عالية',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
      description: 'مثالية للطلاب الذين يحتاجون إلى شرح درس معين، مراجعة قبل اختبار، حل الواجبات، أو الإجابة عن استفسارات محددة.',
      price: '50',
      currency: 'ر.س',
      period: 'لكل حصة',
      features: [
        'مدة الحصة 60 دقيقة',
        'اختيار المادة الدراسية',
        'اختيار المعلم المناسب',
        'اختيار الموعد المفضل',
        'إمكانية إعادة جدولة الموعد',
      ],
      buttonText: 'احجز الآن',
      buttonStyle: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900',
      popular: false
    },
    {
      slug: 'weekly-package',
      title: 'الباقة الأسبوعية',
      badge: '🔥 الأكثر طلباً',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
      description: 'برنامج أسبوعي منتظم يتضمن عدة حصص مع متابعة مستمرة من المعلم لضمان تقدم الطالب وتحقيق أفضل النتائج.',
      price: '180',
      currency: 'ر.س',
      period: 'أسبوعياً',
      saving: 'توفير 10%',
      features: [
        '4 حصص أسبوعياً',
        'متابعة الواجبات المدرسية',
        'تقارير أسبوعية تفصيلية',
        'تواصل مباشر مع المعلم',
        'أولوية حجز المواعيد'
      ],
      buttonText: 'اشترك الآن',
      buttonStyle: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20',
      popular: true
    },
    {
      slug: 'monthly-package',
      title: 'الباقة الشهرية',
      badge: '⭐ أفضل قيمة',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300',
      description: 'برنامج متكامل يوفر متابعة تعليمية مستمرة طوال الشهر، مع خطة تعليمية شخصية وتقارير أداء دورية.',
      price: '650',
      currency: 'ر.س',
      period: 'شهرياً',
      saving: 'توفير 20%',
      features: [
        '16 حصة شهرية',
        'خطة تعليمية شخصية مخصصة',
        'اختبارات تقييمية دورية',
        'تقارير أداء شاملة للأهل',
        'أولوية حجز المواعيد',
        'شهادة إتمام البرنامج'
      ],
      buttonText: 'ابدأ الآن',
      buttonStyle: 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20',
      popular: false
    },
    {
      slug: 'intensive-package',
      title: 'الباقة المكثفة',
      badge: '🚀 استعداد للاختبارات',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
      description: 'برنامج مكثف صُمم خصيصاً لمراجعة المنهج بالكامل قبل الاختبارات، مع التركيز على أهم النقاط وحل الامتحانات.',
      price: '990',
      currency: 'ر.س',
      period: 'برنامج كامل',
      saving: 'توفير 30%',
      features: [
        'مراجعة المنهج بالكامل',
        'حل نماذج امتحانات وسنوات سابقة',
        'تدريبات مكثفة وملخصات شاملة',
        'بنك أسئلة واختبارات تجريبية',
        'تقارير مستوى ودعم مباشر 24/7'
      ],
      buttonText: 'احجز البرنامج',
      buttonStyle: 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-500/20',
      popular: false
    }
  ]

  const comparisonFeatures = [
    { name: 'عدد الحصص', single: '1 حصة', weekly: '4 حصص/أسبوع', monthly: '16 حصة/شهر', intensive: 'برنامج مكثف' },
    { name: 'مدة الحصة', single: '60 دقيقة', weekly: '60 دقيقة', monthly: '60 دقيقة', intensive: '90 دقيقة' },
    { name: 'المتابعة المباشرة', single: '❌', weekly: '✔️', monthly: '✔️', intensive: '✔️ مكثفة' },
    { name: 'متابعة الواجبات', single: '❌', weekly: '✔️', monthly: '✔️', intensive: '✔️' },
    { name: 'التقارير الدورية', single: '❌', weekly: 'أسبوعية', monthly: 'تفصيلية للأهل', intensive: 'تقارير تقييمية' },
    { name: 'الاختبارات والبنك', single: '❌', weekly: 'قصيرة', monthly: 'دورية', intensive: 'شاملة + بنك أسئلة' },
    { name: 'الشهادة', single: '❌', weekly: '❌', monthly: '✔️', intensive: '✔️' },
    { name: 'إعادة الجدولة', single: '✔️', weekly: '✔️', monthly: '✔️', intensive: '✔️ أولوية قصوى' },
    { name: 'الدعم الفني', single: 'عادي', weekly: 'سريع', monthly: 'مباشر 24/7', intensive: 'مخصص 24/7' },
  ]

  const steps = [
    { id: '1', title: 'اختر المادة الدراسية', desc: 'حدد التخصص أو المادة التي ترغب في رفع مستواك فيها.' },
    { id: '2', title: 'اختر المعلم المناسب', desc: 'استعرض خبرات المعلمين والتقييمات واختر الأنسب لك.' },
    { id: '3', title: 'اختر الباقة المناسبة', desc: 'حدد الباقة التعليمية بناءً على أهدافك وميزانيتك.' },
    { id: '4', title: 'حدد الموعد وأكد الحجز', desc: 'اختر الموعد المفضل وابدأ رحلة التعلم المباشر.' }
  ]

  const whyUs = [
    { title: 'معلمون معتمدون', desc: 'نخبة من أفضل المعلمين وأصحاب الخبرات الكبيرة.', icon: UserCheck },
    { title: 'مرونة المواعيد', desc: 'إمكانية اختيار وتغيير الأوقات بما يناسب جدولك.', icon: Calendar },
    { title: 'حصص مباشرة', desc: 'تفاعل حقيقي وصوت وصورة بأعلى جودة أونلاين.', icon: Clock },
    { title: 'تقارير أداء دورية', desc: 'متابعة دقيقة لنسب تحسن المستويات الأكاديمية.', icon: Award },
    { title: 'مواد تعليمية مجانية', desc: 'ملخصات وبنوك أسئلة مرافقة مع كل حصة.', icon: BookOpen },
    { title: 'تذكيرات تلقائية', desc: 'إشعارات عبر النظام والبريد قبل موعد الحصة.', icon: HelpCircle },
  ]

  const faqs = [
    { q: 'كيف أحجز حصة خصوصية؟', a: 'يمكنك اختيار الباقة المناسبة للضغط على زر الحجز، ثم اختيار المعلم والموعد ودفع قيمة الحجز.' },
    { q: 'هل يمكنني تغيير موعد الحصة بعد الحجز؟', a: 'نعم، يتيح النظام إعادة جدولة المواعيد بسهولة قبل بدء الحصة بـ 24 ساعة.' },
    { q: 'هل الحصص تكون أونلاين مباشرة؟', a: 'نعم، جميع الحصص تفاعلية ومباشرة عبر قاعة معلوم الافتراضية الصوتية والمرئية.' },
    { q: 'ماذا يحدث إذا تعذر على المعلم الحضور؟', a: 'يتم تعويض الطالب بحصة إضافية فوراً أو استرداد كامل للمبلغ حسب رغبتك.' },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* 1. Header Section */}
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-4 border border-blue-100 dark:border-blue-900/50">
          <Sparkles className="w-4 h-4" />
          <span>منصة معلوم - تجربة تعليمية فريدة</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-6 bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
          🎓 الحصص الخصوصية
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl mx-auto">
          احجز حصتك مع نخبة من المعلمين المتخصصين، واختر الباقة التعليمية التي تناسب أهدافك الدراسية، سواء كنت تحتاج إلى شرح درس، متابعة مستمرة، أو برنامج تعليمي متكامل.
        </p>
      </div>

      {/* Trust Stats Bar */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200/60 dark:border-slate-800 text-center">
        <div className="p-2">
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">+15,000</p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">حصة منجزة بنجاح</p>
        </div>
        <div className="p-2">
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">+500</p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">معلم معتمد ومتميز</p>
        </div>
        <div className="p-2">
          <p className="text-3xl font-black text-amber-500">4.9 ★</p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">متوسط تقييم الطلاب</p>
        </div>
        <div className="p-2">
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">99%</p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">نسبة رضا الأسر</p>
        </div>
      </div>

      {/* 2. Packages Grid */}
      <div className="max-w-7xl mx-auto mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">الباقات التعليمية المتاحة</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">اختر الباقة المثالية لتحقيق تفوقك الأكاديمي</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {packages.map((pkg, idx) => (
            <div 
              key={idx} 
              className={`relative flex flex-col justify-between rounded-3xl p-6 bg-white dark:bg-slate-900 border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
                pkg.popular 
                  ? 'border-blue-500 shadow-xl shadow-blue-500/10 dark:border-blue-500 ring-2 ring-blue-500/20' 
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {pkg.saving && (
                <span className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-md">
                  {pkg.saving}
                </span>
              )}

              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${pkg.badgeColor}`}>
                    {pkg.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2">{pkg.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed min-h-[48px]">
                  {pkg.description}
                </p>

                <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">{pkg.price}</span>
                    <span className="text-sm font-bold text-slate-500">{pkg.currency}</span>
                  </div>
                  <span className="text-xs text-slate-400">{pkg.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {pkg.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/private-lessons/$slug"
                params={{ slug: pkg.slug }}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-sm text-center block transition-all duration-200 ${pkg.buttonStyle}`}
              >
                {pkg.buttonText}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Comparison Table */}
      <div className="max-w-6xl mx-auto mb-24 overflow-hidden">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">مقارنة شاملة بين الباقات</h2>
          <p className="text-slate-500 mt-2">جدول توضيحي يساعدك على تحديد الخيار الأنسب</p>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs text-slate-500">
                <th className="p-4 font-bold text-sm text-slate-900 dark:text-white">الميزة / الخدمة</th>
                <th className="p-4 font-bold text-center">المفردة</th>
                <th className="p-4 font-bold text-center text-blue-600 dark:text-blue-400">الأسبوعية</th>
                <th className="p-4 font-bold text-center text-purple-600 dark:text-purple-400">الشهرية</th>
                <th className="p-4 font-bold text-center text-rose-600 dark:text-rose-400">المكثفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {comparisonFeatures.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{row.name}</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">{row.single}</td>
                  <td className="p-4 text-center font-semibold text-slate-800 dark:text-slate-200">{row.weekly}</td>
                  <td className="p-4 text-center font-semibold text-slate-800 dark:text-slate-200">{row.monthly}</td>
                  <td className="p-4 text-center font-semibold text-slate-800 dark:text-slate-200">{row.intensive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. How It Works Timeline */}
      <div className="max-w-6xl mx-auto mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-3">كيف تعمل الخدمة؟</h2>
          <p className="text-slate-500">احجز حصتك واستعد للتفوق في 4 خطوات سهلة جداً</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.id} className="relative bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <span className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg mb-4">
                {step.id}
              </span>
              <h3 className="font-bold text-base mb-2">{step.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Why Choose Us */}
      <div className="max-w-6xl mx-auto mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-3">لماذا تختار الحصص الخصوصية في منصة معلوم؟</h2>
          <p className="text-slate-500">نضمن لك تجربة تعليمية قائمة على أحدث المناهج والمعايير العالمية</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyUs.map((item, idx) => {
            const Icon = item.icon
            return (
              <div key={idx} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 6. FAQ Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">الأسئلة الشائعة</h2>
          <p className="text-slate-500">إجابات عن معظم الاستفسارات حول الحصص الخصوصية</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                {faq.q}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 pr-7 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}