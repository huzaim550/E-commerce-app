import { formatMoney, type MoneyConfig } from "@/lib/money";
import type { Totals } from "@/lib/pricing";

/** Shared by the cart, checkout and confirmation pages so the numbers match. */
export function OrderSummary({
  totals,
  money,
  taxRatePct,
  couponCode,
  shippingLabel,
  children,
}: {
  totals: Totals;
  money: MoneyConfig;
  taxRatePct?: number;
  couponCode?: string | null;
  shippingLabel?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold">Order summary</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">
            Subtotal ({totals.itemCount} item{totals.itemCount === 1 ? "" : "s"})
          </dt>
          <dd>{formatMoney(totals.subtotalCents, money)}</dd>
        </div>

        {totals.discountCents > 0 && (
          <div className="flex justify-between text-green-700">
            <dt>Discount {couponCode && <span className="font-medium">({couponCode})</span>}</dt>
            <dd>−{formatMoney(totals.discountCents, money)}</dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt className="text-muted">
            Shipping{shippingLabel ? ` · ${shippingLabel}` : ""}
          </dt>
          <dd>
            {totals.shippingCents === 0 ? "Free" : formatMoney(totals.shippingCents, money)}
          </dd>
        </div>

        {totals.taxCents > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Tax{taxRatePct ? ` (${taxRatePct}%)` : ""}</dt>
            <dd>{formatMoney(totals.taxCents, money)}</dd>
          </div>
        )}

        <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatMoney(totals.totalCents, money)}</dd>
        </div>
      </dl>

      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
