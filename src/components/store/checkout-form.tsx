"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Loader2, Tag } from "lucide-react";
import { placeOrder, previewCoupon } from "@/app/actions/checkout";
import { computeTotals, type PricedLine } from "@/lib/pricing";
import { formatMoney, type MoneyConfig } from "@/lib/money";
import { OrderSummary } from "@/components/store/order-summary";
import { Button, Input, Field, Alert } from "@/components/ui";
import type { ActionResult } from "@/lib/validation";
import type { CouponModel, ShippingRateModel } from "@/generated/prisma/models";

type Props = {
  lines: PricedLine[];
  money: MoneyConfig;
  taxRatePct: number;
  taxInclusive: boolean;
  shippingRates: ShippingRateModel[];
  paymentMethods: { method: string; label: string; description: string }[];
  defaults: { customerName: string; email: string; phone: string };
};

export function CheckoutForm({
  lines,
  money,
  taxRatePct,
  taxInclusive,
  shippingRates,
  paymentMethods,
  defaults,
}: Props) {
  const [state, formAction, submitting] = useActionState<ActionResult | null, FormData>(
    placeOrder,
    null,
  );

  const [shippingRateId, setShippingRateId] = useState(shippingRates[0]?.id ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponModel | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, startCouponCheck] = useTransition();

  const selectedRate = shippingRates.find((r) => r.id === shippingRateId) ?? null;

  // Same function the server uses, so this preview cannot drift from the charge.
  const totals = useMemo(
    () =>
      computeTotals({
        lines,
        coupon: appliedCoupon,
        shippingRate: selectedRate,
        taxRatePct,
        taxInclusive,
      }),
    [lines, appliedCoupon, selectedRate, taxRatePct, taxInclusive],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0),
    [lines],
  );

  function applyCoupon() {
    setCouponError(null);
    startCouponCheck(async () => {
      const result = await previewCoupon(couponInput, subtotal);
      if (result.ok && result.data) {
        // Reconstruct the minimal coupon shape the pricing function needs;
        // the server re-validates the code on submit regardless.
        setAppliedCoupon({
          code: result.data.code,
          type: "FIXED",
          value: result.data.discountCents,
          minOrderCents: null,
          maxUses: null,
          usedCount: 0,
          startsAt: null,
          expiresAt: null,
          active: true,
          createdAt: new Date(),
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(result.ok ? null : result.error);
      }
    });
  }

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <input type="hidden" name="shippingRateId" value={shippingRateId} />
      <input type="hidden" name="couponCode" value={appliedCoupon?.code ?? ""} />

      <div className="space-y-8">
        {state && !state.ok && <Alert tone="error">{state.error}</Alert>}

        <section>
          <h2 className="mb-4 text-lg font-semibold">Contact details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.customerName} htmlFor="customerName">
              <Input
                id="customerName"
                name="customerName"
                defaultValue={defaults.customerName}
                autoComplete="name"
                required
              />
            </Field>
            <Field label="Phone" required error={errors.phone} htmlFor="phone">
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={defaults.phone}
                autoComplete="tel"
                required
              />
            </Field>
            <Field
              label="Email"
              hint="Optional — for the order confirmation."
              error={errors.email}
              htmlFor="email"
              className="sm:col-span-2"
            >
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={defaults.email}
                autoComplete="email"
              />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Delivery address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Address"
              required
              error={errors.line1}
              htmlFor="line1"
              className="sm:col-span-2"
            >
              <Input id="line1" name="line1" autoComplete="address-line1" required />
            </Field>
            <Field
              label="Apartment, suite, etc."
              error={errors.line2}
              htmlFor="line2"
              className="sm:col-span-2"
            >
              <Input id="line2" name="line2" autoComplete="address-line2" />
            </Field>
            <Field label="City" required error={errors.city} htmlFor="city">
              <Input id="city" name="city" autoComplete="address-level2" required />
            </Field>
            <Field label="State / region" error={errors.region} htmlFor="region">
              <Input id="region" name="region" autoComplete="address-level1" />
            </Field>
            <Field label="Postal code" error={errors.postalCode} htmlFor="postalCode">
              <Input id="postalCode" name="postalCode" autoComplete="postal-code" />
            </Field>
            <Field label="Country" error={errors.country} htmlFor="country">
              <Input id="country" name="country" autoComplete="country-name" />
            </Field>
            <Field
              label="Order notes"
              hint="Delivery instructions, landmarks, anything else."
              htmlFor="note"
              className="sm:col-span-2"
            >
              <Input id="note" name="note" />
            </Field>
          </div>
        </section>

        {shippingRates.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Delivery method</h2>
            <div className="space-y-2">
              {shippingRates.map((rate) => {
                const free =
                  rate.type === "FREE_OVER" &&
                  rate.thresholdCents !== null &&
                  subtotal - totals.discountCents >= rate.thresholdCents;

                return (
                  <label
                    key={rate.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${
                      shippingRateId === rate.id ? "border-accent bg-surface" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingChoice"
                      value={rate.id}
                      checked={shippingRateId === rate.id}
                      onChange={() => setShippingRateId(rate.id)}
                      className="size-4 accent-[var(--store-accent)]"
                    />
                    <span className="flex-1 text-sm font-medium">{rate.name}</span>
                    <span className="text-sm">
                      {free || rate.amountCents === 0
                        ? "Free"
                        : formatMoney(rate.amountCents, money)}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold">Payment</h2>
          <div className="space-y-2">
            {paymentMethods.map((method, index) => (
              <label
                key={method.method}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4 has-checked:border-accent has-checked:bg-surface"
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.method}
                  defaultChecked={index === 0}
                  className="mt-0.5 size-4 accent-[var(--store-accent)]"
                />
                <span>
                  <span className="block text-sm font-medium">{method.label}</span>
                  <span className="block text-xs text-muted">{method.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <OrderSummary
          totals={totals}
          money={money}
          taxRatePct={taxRatePct}
          couponCode={appliedCoupon?.code}
          shippingLabel={selectedRate?.name}
        >
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                aria-label="Coupon code"
                className="bg-bg"
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyCoupon}
                disabled={checkingCoupon || !couponInput.trim()}
              >
                {checkingCoupon ? <Loader2 className="size-4 animate-spin" /> : <Tag className="size-4" />}
                Apply
              </Button>
            </div>
            {couponError && <p className="text-xs text-red-600">{couponError}</p>}
            {appliedCoupon && (
              <p className="text-xs text-green-700">
                {appliedCoupon.code} applied.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput("");
                  }}
                >
                  Remove
                </button>
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="mt-4 w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Place order
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            You&apos;ll get an order number to track your delivery.
          </p>
        </OrderSummary>
      </div>
    </form>
  );
}
