/**
 * Currencies offered in Admin → Settings.
 *
 * `code` is the ISO 4217 code passed to Intl.NumberFormat; `symbol` is the
 * fallback used when a runtime can't resolve a narrow symbol for the code.
 * `locale` is a sensible default formatting locale, applied when the admin
 * picks a currency so they don't have to know BCP 47 tags.
 *
 * This is a convenience list, not a restriction — `parseMoneyToCents` and
 * `formatMoney` work with any code, and the form still allows a custom one.
 */

export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
  locale: string;
};

export const currencies: CurrencyOption[] = [
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", locale: "en-PK" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", locale: "ar-SA" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", locale: "bn-BD" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", locale: "si-LK" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "Rs", locale: "ne-NP" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$", locale: "en-CA" },
  { code: "AUD", name: "Australian Dollar", symbol: "$", locale: "en-AU" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "$", locale: "en-NZ" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$", locale: "en-SG" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", locale: "ms-MY" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", locale: "id-ID" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", locale: "en-PH" },
  { code: "THB", name: "Thai Baht", symbol: "฿", locale: "th-TH" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", locale: "vi-VN" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", locale: "zh-CN" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", locale: "ko-KR" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "$", locale: "zh-HK" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", locale: "tr-TR" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", locale: "ar-EG" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", locale: "en-NG" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
  { code: "ZAR", name: "South African Rand", symbol: "R", locale: "en-ZA" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", locale: "en-GH" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "DH", locale: "ar-MA" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", locale: "pt-BR" },
  { code: "MXN", name: "Mexican Peso", symbol: "$", locale: "es-MX" },
  { code: "ARS", name: "Argentine Peso", symbol: "$", locale: "es-AR" },
  { code: "CLP", name: "Chilean Peso", symbol: "$", locale: "es-CL" },
  { code: "COP", name: "Colombian Peso", symbol: "$", locale: "es-CO" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", locale: "sv-SE" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", locale: "nb-NO" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", locale: "da-DK" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", locale: "pl-PL" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", locale: "cs-CZ" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", locale: "ro-RO" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", locale: "ru-RU" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", locale: "uk-UA" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", locale: "he-IL" },
];

export function findCurrency(code: string): CurrencyOption | undefined {
  return currencies.find((c) => c.code === code.toUpperCase());
}

/**
 * Zero-decimal currencies (JPY, KRW, …) need no special handling: prices are
 * stored on a fixed x100 internal scale, and Intl drops the decimals on
 * display, so entering 1500 for JPY correctly shows ¥1,500.
 */
