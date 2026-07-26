export interface ArabCountry {
  code: string;       // ISO code
  name: string;       // Arabic name
  dialCode: string;   // e.g. "+966"
  flag: string;       // emoji
}

export const ARAB_COUNTRIES: ArabCountry[] = [
  { code: "SA", name: "السعودية", dialCode: "+966", flag: "🇸🇦" },
  { code: "AE", name: "الإمارات", dialCode: "+971", flag: "🇦🇪" },
  { code: "EG", name: "مصر", dialCode: "+20", flag: "🇪🇬" },
  { code: "DZ", name: "الجزائر", dialCode: "+213", flag: "🇩🇿" },
  { code: "MA", name: "المغرب", dialCode: "+212", flag: "🇲🇦" },
  { code: "TN", name: "تونس", dialCode: "+216", flag: "🇹🇳" },
  { code: "LY", name: "ليبيا", dialCode: "+218", flag: "🇱🇾" },
  { code: "SD", name: "السودان", dialCode: "+249", flag: "🇸🇩" },
  { code: "JO", name: "الأردن", dialCode: "+962", flag: "🇯🇴" },
  { code: "LB", name: "لبنان", dialCode: "+961", flag: "🇱🇧" },
  { code: "SY", name: "سوريا", dialCode: "+963", flag: "🇸🇾" },
  { code: "IQ", name: "العراق", dialCode: "+964", flag: "🇮🇶" },
  { code: "PS", name: "فلسطين", dialCode: "+970", flag: "🇵🇸" },
  { code: "YE", name: "اليمن", dialCode: "+967", flag: "🇾🇪" },
  { code: "OM", name: "عُمان", dialCode: "+968", flag: "🇴🇲" },
  { code: "QA", name: "قطر", dialCode: "+974", flag: "🇶🇦" },
  { code: "BH", name: "البحرين", dialCode: "+973", flag: "🇧🇭" },
  { code: "KW", name: "الكويت", dialCode: "+965", flag: "🇰🇼" },
  { code: "MR", name: "موريتانيا", dialCode: "+222", flag: "🇲🇷" },
  { code: "SO", name: "الصومال", dialCode: "+252", flag: "🇸🇴" },
  { code: "DJ", name: "جيبوتي", dialCode: "+253", flag: "🇩🇯" },
  { code: "KM", name: "جزر القمر", dialCode: "+269", flag: "🇰🇲" },
];

export const getCountryByCode = (code: string) =>
  ARAB_COUNTRIES.find((c) => c.code === code);
