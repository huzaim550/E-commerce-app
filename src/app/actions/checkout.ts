"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getOrCreateCart, toCartLines, toPricedLines } from "@/lib/cart";
import { getSession } from "@/lib/auth";
import {
  computeTotals,
  checkCoupon,
  couponRejectionMessages,
} from "@/lib/pricing";
import { getPaymentProvider } from "@/lib/payments";
import { createOrder, OutOfStockError, CouponExhaustedError } from "@/lib/orders";
import {
  checkoutSchema,
  failure,
  fieldErrorsOf,
  type ActionResult,
} from "@/lib/validation";

/** Human-readable, non-sequential-looking order number. */
async function nextOrderNumber(prefix: string) {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const number = `${prefix}-${stamp}-${suffix}`;
    const clash = await prisma.order.findUnique({
      where: { number },
      select: { id: true },
    });
    if (!clash) return number;
  }
  return `${prefix}-${stamp}-${Date.now().toString().slice(-6)}`;
}

export async function placeOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse({
    ...Object.fromEntries(formData),
  });

  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  const settings = await getSettings();
  const cart = await getOrCreateCart();
  const lines = toCartLines(cart);

  if (lines.length === 0) {
    return failure("Your cart is empty.");
  }

  // Re-resolve coupon and shipping server-side; never trust posted amounts.
  const coupon = input.couponCode
    ? await prisma.coupon.findUnique({
        where: { code: input.couponCode.toUpperCase() },
      })
    : null;

  const pricedLines = toPricedLines(lines);
  const subtotal = pricedLines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0);

  if (coupon) {
    const check = checkCoupon(coupon, subtotal);
    if (!check.ok) return failure(couponRejectionMessages[check.reason]);
  }

  const shippingRate = input.shippingRateId
    ? await prisma.shippingRate.findFirst({
        where: { id: input.shippingRateId, active: true },
      })
    : null;

  const totals = computeTotals({
    lines: pricedLines,
    coupon,
    shippingRate,
    taxRatePct: settings.taxRatePct,
    taxInclusive: settings.taxInclusive,
  });

  const session = await getSession();
  const orderNumber = await nextOrderNumber(settings.orderPrefix);
  const provider = getPaymentProvider(input.paymentMethod);
  const payment = await provider.begin({
    orderNumber,
    totals,
    customerName: input.customerName,
    email: input.email,
  });

  try {
    await createOrder({
      number: orderNumber,
      lines,
      totals,
      couponCode: coupon?.code ?? null,
      couponMaxUses: coupon?.maxUses ?? null,
      shippingName: shippingRate?.name ?? null,
      paymentMethod: input.paymentMethod,
      paymentStatus: payment.paymentStatus,
      paymentLabel: provider.label,
      customerName: input.customerName,
      phone: input.phone,
      email: input.email || null,
      note: input.note || null,
      address: {
        line1: input.line1,
        line2: input.line2 || "",
        city: input.city,
        region: input.region || "",
        postalCode: input.postalCode || "",
        country: input.country || "",
      },
      userId: session?.userId ?? null,
      cartId: cart.id,
    });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      return failure(
        `Sorry — "${error.title}" sold out while you were checking out. Please review your cart.`,
      );
    }
    if (error instanceof CouponExhaustedError) {
      return failure("That coupon was just fully redeemed. Please remove it and try again.");
    }
    console.error("Order creation failed:", error);
    return failure("Something went wrong placing your order. Please try again.");
  }

  revalidatePath("/", "layout");
  redirect(payment.redirectUrl ?? `/order/${orderNumber}`);
}

/** Live coupon preview on the checkout page. */
export async function previewCoupon(
  code: string,
  subtotalCents: number,
): Promise<ActionResult<{ code: string; discountCents: number }>> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return failure("Enter a coupon code.");

  const coupon = await prisma.coupon.findUnique({ where: { code: trimmed } });
  const check = checkCoupon(coupon, subtotalCents);

  if (!check.ok) return failure(couponRejectionMessages[check.reason]);

  const discountCents =
    check.coupon.type === "PERCENT"
      ? Math.round((subtotalCents * check.coupon.value) / 100)
      : Math.min(check.coupon.value, subtotalCents);

  return {
    ok: true,
    data: { code: trimmed, discountCents },
    message: "Coupon applied.",
  };
}
