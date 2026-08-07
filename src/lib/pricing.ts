import type { CouponModel, ShippingRateModel } from "@/generated/prisma/models";

type Coupon = CouponModel;
type ShippingRate = ShippingRateModel;

/**
 * The single place order money is computed. The cart page, the checkout summary
 * and order creation all call `computeTotals` with the same inputs, so what the
 * customer sees is by construction what gets persisted and charged.
 *
 * Order of operations: subtotal -> discount -> shipping -> tax -> total.
 * Tax applies to the discounted subtotal (not to shipping), which is the
 * common small-retail convention.
 */

export type PricedLine = {
  variantId: string;
  qty: number;
  unitPriceCents: number;
  taxable: boolean;
  weightGrams: number;
};

export type TotalsInput = {
  lines: PricedLine[];
  coupon?: Coupon | null;
  shippingRate?: ShippingRate | null;
  taxRatePct: number;
  taxInclusive: boolean;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
};

export function lineTotal(line: PricedLine) {
  return line.unitPriceCents * line.qty;
}

export function computeSubtotal(lines: PricedLine[]) {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function computeDiscount(subtotalCents: number, coupon?: Coupon | null) {
  if (!coupon) return 0;
  if (coupon.minOrderCents && subtotalCents < coupon.minOrderCents) return 0;

  const raw =
    coupon.type === "PERCENT"
      ? Math.round((subtotalCents * coupon.value) / 100)
      : coupon.value;

  // Never discount below zero.
  return Math.max(0, Math.min(raw, subtotalCents));
}

export function computeShipping(
  lines: PricedLine[],
  discountedSubtotalCents: number,
  rate?: ShippingRate | null,
) {
  if (!rate) return 0;
  if (lines.length === 0) return 0;

  switch (rate.type) {
    case "FREE_OVER":
      if (rate.thresholdCents !== null && discountedSubtotalCents >= rate.thresholdCents) {
        return 0;
      }
      return rate.amountCents;
    case "WEIGHT": {
      const grams = lines.reduce((sum, l) => sum + l.weightGrams * l.qty, 0);
      const kg = Math.ceil(grams / 1000);
      return rate.amountCents + kg * (rate.perKgCents ?? 0);
    }
    case "FLAT":
    default:
      return rate.amountCents;
  }
}

export function computeTotals(input: TotalsInput): Totals {
  const { lines, coupon, shippingRate, taxRatePct, taxInclusive } = input;

  const subtotalCents = computeSubtotal(lines);
  const discountCents = computeDiscount(subtotalCents, coupon);
  const discountedSubtotal = subtotalCents - discountCents;
  const shippingCents = computeShipping(lines, discountedSubtotal, shippingRate);

  let taxCents = 0;
  if (taxRatePct > 0 && !taxInclusive) {
    // Only taxable lines contribute, scaled by the share of the discount they absorbed.
    const taxableGross = lines
      .filter((l) => l.taxable)
      .reduce((sum, l) => sum + lineTotal(l), 0);
    const taxableNet =
      subtotalCents > 0
        ? taxableGross - Math.round((discountCents * taxableGross) / subtotalCents)
        : 0;
    taxCents = Math.round((taxableNet * taxRatePct) / 100);
  }

  const totalCents = discountedSubtotal + shippingCents + taxCents;
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: Math.max(0, totalCents),
    itemCount,
  };
}

// ---------------------------------------------------------------- coupons

export type CouponRejection =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "used_up"
  | "min_order";

export const couponRejectionMessages: Record<CouponRejection, string> = {
  not_found: "That coupon code doesn't exist.",
  inactive: "That coupon is no longer active.",
  not_started: "That coupon isn't active yet.",
  expired: "That coupon has expired.",
  used_up: "That coupon has reached its usage limit.",
  min_order: "Your order doesn't meet this coupon's minimum.",
};

/** Pure validity check, shared by the cart UI and order creation. */
export function checkCoupon(
  coupon: Coupon | null,
  subtotalCents: number,
  now = new Date(),
): { ok: true; coupon: Coupon } | { ok: false; reason: CouponRejection } {
  if (!coupon) return { ok: false, reason: "not_found" };
  if (!coupon.active) return { ok: false, reason: "inactive" };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: "not_started" };
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, reason: "expired" };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: "used_up" };
  }
  if (coupon.minOrderCents && subtotalCents < coupon.minOrderCents) {
    return { ok: false, reason: "min_order" };
  }
  return { ok: true, coupon };
}
