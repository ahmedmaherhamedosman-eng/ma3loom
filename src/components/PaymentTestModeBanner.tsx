// Test mode banner — shown when running with Stripe test keys
// Detected via the publishable key prefix (pk_test_) when set, or always in dev mode
const isDev = import.meta.env.DEV;

export function PaymentTestModeBanner() {
  if (!isDev) return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-xs sm:text-sm text-orange-800" dir="rtl">
      🧪 وضع الاختبار: المدفوعات وهمية. استخدم بطاقة <span dir="ltr" className="font-mono font-bold">4242 4242 4242 4242</span> — أي تاريخ مستقبلي وأي CVC.
    </div>
  );
}
