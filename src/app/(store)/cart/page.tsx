import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getCart, toCartLines, toPricedLines } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { CartView } from "@/components/store/cart-view";
import { OrderSummary } from "@/components/store/order-summary";
import { EmptyState, ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const [settings, cart] = await Promise.all([getSettings(), getCart()]);
  const lines = toCartLines(cart);

  if (lines.length === 0) {
    return (
      <div className="container-store py-16">
        <EmptyState
          icon={<ShoppingBag className="size-8" />}
          title="Your cart is empty"
          description="Once you add something, it'll show up here."
          action={<ButtonLink href="/products">Start shopping</ButtonLink>}
        />
      </div>
    );
  }

  // No shipping or coupon yet — those are chosen at checkout.
  const totals = computeTotals({
    lines: toPricedLines(lines),
    taxRatePct: settings.taxRatePct,
    taxInclusive: settings.taxInclusive,
  });

  return (
    <div className="container-store py-8">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Your cart</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <CartView lines={lines} money={settings} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary totals={totals} money={settings} taxRatePct={settings.taxRatePct}>
            <ButtonLink href="/checkout" size="lg" className="w-full">
              Proceed to checkout
            </ButtonLink>
            <p className="mt-3 text-center text-xs text-muted">
              Shipping and discounts are applied at checkout.
            </p>
          </OrderSummary>
        </div>
      </div>
    </div>
  );
}
