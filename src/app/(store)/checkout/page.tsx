import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCart, toCartLines, toPricedLines } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { enabledPaymentMethods, paymentProviders } from "@/lib/payments";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [settings, cart, user] = await Promise.all([
    getSettings(),
    getCart(),
    getCurrentUser(),
  ]);

  const lines = toCartLines(cart);
  if (lines.length === 0) redirect("/cart");

  const shippingRates = await prisma.shippingRate.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { amountCents: "asc" }],
  });

  return (
    <div className="container-store py-8">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Checkout</h1>

      <CheckoutForm
        lines={toPricedLines(lines)}
        money={settings}
        taxRatePct={settings.taxRatePct}
        taxInclusive={settings.taxInclusive}
        shippingRates={shippingRates}
        paymentMethods={enabledPaymentMethods.map((method) => ({
          method,
          label: paymentProviders[method].label,
          description: paymentProviders[method].description,
        }))}
        defaults={{
          customerName: user?.name ?? "",
          email: user?.email ?? "",
          phone: user?.phone ?? "",
        }}
      />
    </div>
  );
}
