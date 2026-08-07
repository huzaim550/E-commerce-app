/**
 * Every monetary value in this app is an integer count of minor units
 * (cents, paisa). Formatting is the only place that divides by 100.
 */

export type MoneyConfig = {
  currency: string;
  currencySymbol: string;
  locale: string;
};

export function formatMoney(cents: number, config: MoneyConfig): string {
  const amount = cents / 100;
  try {
    // Intl gives correct grouping and decimal rules per locale.
    const formatted = new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
    return formatted;
  } catch {
    // Unknown/custom currency code (e.g. a made-up one in settings) — fall
    // back to the admin's symbol rather than throwing mid-render.
    const formatted = new Intl.NumberFormat(config.locale || "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${config.currencySymbol}${formatted}`;
  }
}

/** Parses a user-typed amount ("1,299.50") into minor units. */
export function parseMoneyToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const raw = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(raw)) return 0;
  return Math.round(raw * 100);
}

/** Minor units -> a value suitable for a number input's `defaultValue`. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

export function discountPercent(priceCents: number, compareCents: number | null) {
  if (!compareCents || compareCents <= priceCents) return null;
  return Math.round(((compareCents - priceCents) / compareCents) * 100);
}
