import "server-only";
import { prisma } from "@/lib/db";
import type { Totals } from "@/lib/pricing";
import type { CartLine } from "@/lib/cart";
import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

/**
 * Order creation, isolated from the request so it can be exercised directly by
 * tests (see scripts/test-concurrency.ts). Everything here runs in one
 * transaction: if any part fails, no stock moves and no order exists.
 */

export class OutOfStockError extends Error {
  constructor(readonly title: string) {
    super(`out_of_stock:${title}`);
    this.name = "OutOfStockError";
  }
}

export class CouponExhaustedError extends Error {
  constructor() {
    super("coupon_exhausted");
    this.name = "CouponExhaustedError";
  }
}

export type CreateOrderInput = {
  number: string;
  lines: CartLine[];
  totals: Totals;
  couponCode: string | null;
  couponMaxUses: number | null;
  shippingName: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentLabel: string;
  customerName: string;
  phone: string;
  email: string | null;
  note: string | null;
  address: {
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  userId: string | null;
  /** Emptied only after everything else commits. */
  cartId: string | null;
};

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    // Guarded decrement. `stock: { gte: qty }` makes the UPDATE match only if
    // the stock is still there, and Postgres serialises the row lock, so two
    // concurrent checkouts for the last unit can't both succeed: the loser
    // gets count === 0 and throws, rolling back the whole transaction.
    for (const line of input.lines) {
      const result = await tx.productVariant.updateMany({
        where: { id: line.variantId, stock: { gte: line.qty } },
        data: { stock: { decrement: line.qty } },
      });
      if (result.count === 0) throw new OutOfStockError(line.title);
    }

    if (input.couponCode) {
      if (input.couponMaxUses !== null) {
        // Same guard, for redemption limits.
        const claimed = await tx.coupon.updateMany({
          where: { code: input.couponCode, usedCount: { lt: input.couponMaxUses } },
          data: { usedCount: { increment: 1 } },
        });
        if (claimed.count === 0) throw new CouponExhaustedError();
      } else {
        await tx.coupon.update({
          where: { code: input.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const order = await tx.order.create({
      data: {
        number: input.number,
        status: "PENDING",
        paymentStatus: input.paymentStatus,
        paymentMethod: input.paymentMethod,
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        note: input.note,
        address: input.address,
        subtotalCents: input.totals.subtotalCents,
        shippingCents: input.totals.shippingCents,
        discountCents: input.totals.discountCents,
        taxCents: input.totals.taxCents,
        totalCents: input.totals.totalCents,
        couponCode: input.couponCode,
        shippingName: input.shippingName,
        userId: input.userId,
        items: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            titleSnapshot: line.title,
            optionsSnapshot: line.options,
            imageSnapshot: line.image,
            unitPriceCents: line.unitPriceCents,
            qty: line.qty,
          })),
        },
        events: {
          create: { type: "created", note: `Order placed · ${input.paymentLabel}` },
        },
      },
      select: { id: true, number: true },
    });

    if (input.cartId) {
      await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });
    }

    return order;
  });
}
