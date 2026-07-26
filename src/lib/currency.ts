// Currency helpers — supports multi-currency pricing across courses, books, live sessions.
export const SUPPORTED_CURRENCIES = ["SAR", "USD", "EUR", "EGP", "AED"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const SYMBOLS: Record<string, string> = {
  SAR: "ر.س",
  USD: "$",
  EUR: "€",
  EGP: "ج.م",
  AED: "د.إ",
};

const LOCALE_BY_CURRENCY: Record<string, string> = {
  SAR: "ar-SA",
  EGP: "ar-EG",
  AED: "ar-AE",
  USD: "en-US",
  EUR: "en-IE",
};

export function currencySymbol(code?: string | null): string {
  if (!code) return "ر.س";
  return SYMBOLS[code.toUpperCase()] || code.toUpperCase();
}

export function formatPrice(amount: number | string | null | undefined, code?: string | null): string {
  const num = Number(amount || 0);
  const cur = (code || "SAR").toUpperCase();
  const locale = LOCALE_BY_CURRENCY[cur] || "ar";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: num % 1 === 0 ? 0 : 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currencySymbol(cur)}`;
  }
}
