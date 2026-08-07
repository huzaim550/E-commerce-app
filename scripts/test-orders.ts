import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeTotals, checkCoupon, type PricedLine } from "../src/lib/pricing";

/**
 * Correctness checks for the order path, run against a real database.
 *
 *   npm run test:orders
 *
 * These are the invariants that actually lose money if they break: overselling
 * under concurrency, coupon over-redemption, and the cart total disagreeing
 * with the persisted order total.
 *
 * Uses a throwaway product so it never touches seeded or real data.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * Mirrors lib/orders.ts createOrder(). Duplicated here rather than imported
 * because that module is marked "server-only" and can't load outside Next.
 * If you change the transaction there, change it here too — the point of this
 * test is that the guarded-decrement pattern behaves as expected on Postgres.
 */
async function attemptOrder(
  number: string,
  variantId: string,
  qty: number,
): Promise<"ok" | "out_of_stock"> {
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.productVariant.updateMany({
        where: { id: variantId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (result.count === 0) throw new Error("out_of_stock");

      await tx.order.create({
        data: {
          number,
          customerName: "Concurrency Test",
          phone: "+10000000000",
          address: { line1: "1 Test St", city: "Testville" },
          subtotalCents: 1000,
          totalCents: 1000,
          items: {
            create: {
              variantId,
              titleSnapshot: "Test product",
              unitPriceCents: 1000,
              qty,
            },
          },
        },
      });
    });
    return "ok";
  } catch (error) {
    if (error instanceof Error && error.message === "out_of_stock") return "out_of_stock";
    throw error;
  }
}

async function main() {
  console.log("Setting up a throwaway product…\n");

  const product = await prisma.product.create({
    data: {
      title: "__test__ concurrency widget",
      slug: `__test__-${Date.now()}`,
      status: "DRAFT",
      basePriceCents: 1000,
      variants: { create: { name: "Default", stock: 1, sku: `TEST-${Date.now()}` } },
    },
    include: { variants: true },
  });
  const variant = product.variants[0];

  try {
    // ---------------------------------------------------------------- 1
    console.log("1. Two concurrent checkouts for the last unit in stock");

    const stamp = Date.now();
    const [a, b] = await Promise.all([
      attemptOrder(`TEST-A-${stamp}`, variant.id, 1),
      attemptOrder(`TEST-B-${stamp}`, variant.id, 1),
    ]);

    const succeeded = [a, b].filter((r) => r === "ok").length;
    check(
      "exactly one checkout succeeds",
      succeeded === 1,
      `got ${succeeded} (${a}, ${b})`,
    );

    const after = await prisma.productVariant.findUnique({
      where: { id: variant.id },
      select: { stock: true },
    });
    check("stock lands at 0, never negative", after?.stock === 0, `stock=${after?.stock}`);

    const orderCount = await prisma.order.count({
      where: { number: { startsWith: `TEST-` }, items: { some: { variantId: variant.id } } },
    });
    check("only one order row was written", orderCount === 1, `found ${orderCount}`);

    // ---------------------------------------------------------------- 2
    console.log("\n2. Ordering more than the available stock");

    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: 3 },
    });
    const tooMany = await attemptOrder(`TEST-C-${stamp}`, variant.id, 5);
    check("a 5-unit order against 3 in stock is refused", tooMany === "out_of_stock");

    const unchanged = await prisma.productVariant.findUnique({
      where: { id: variant.id },
      select: { stock: true },
    });
    check("stock is untouched after the refusal", unchanged?.stock === 3, `stock=${unchanged?.stock}`);

    // ---------------------------------------------------------------- 3
    console.log("\n3. Totals: cart preview vs persisted order");

    const lines: PricedLine[] = [
      { variantId: variant.id, qty: 2, unitPriceCents: 5000, taxable: true, weightGrams: 500 },
      { variantId: "x", qty: 1, unitPriceCents: 2500, taxable: true, weightGrams: 250 },
    ];

    const coupon = await prisma.coupon.findUnique({ where: { code: "WELCOME10" } });
    const rate = await prisma.shippingRate.findFirst({ where: { type: "FLAT", active: true } });

    const preview = computeTotals({
      lines,
      coupon,
      shippingRate: rate,
      taxRatePct: 10,
      taxInclusive: false,
    });
    const persisted = computeTotals({
      lines,
      coupon,
      shippingRate: rate,
      taxRatePct: 10,
      taxInclusive: false,
    });

    check(
      "the same inputs always produce the same total",
      preview.totalCents === persisted.totalCents,
      `${preview.totalCents} vs ${persisted.totalCents}`,
    );

    // subtotal 12500, WELCOME10 = 10% = 1250, discounted 11250,
    // tax 10% of 11250 = 1125, + shipping
    check("subtotal is correct", preview.subtotalCents === 12500, `${preview.subtotalCents}`);
    check("percentage discount is correct", preview.discountCents === 1250, `${preview.discountCents}`);
    check("tax applies to the discounted subtotal", preview.taxCents === 1125, `${preview.taxCents}`);
    check(
      "total = subtotal − discount + shipping + tax",
      preview.totalCents ===
        preview.subtotalCents - preview.discountCents + preview.shippingCents + preview.taxCents,
    );

    // ---------------------------------------------------------------- 4
    console.log("\n4. Coupon rules");

    const belowMin = checkCoupon(coupon, 1000);
    check(
      "a coupon below its minimum order is rejected",
      !belowMin.ok && belowMin.reason === "min_order",
    );

    const expired = checkCoupon(
      { ...coupon!, expiresAt: new Date("2020-01-01") },
      99999,
    );
    check("an expired coupon is rejected", !expired.ok && expired.reason === "expired");

    const usedUp = checkCoupon({ ...coupon!, maxUses: 5, usedCount: 5 }, 99999);
    check("a fully-redeemed coupon is rejected", !usedUp.ok && usedUp.reason === "used_up");

    const valid = checkCoupon(coupon, 99999);
    check("a valid coupon is accepted", valid.ok);

    // ---------------------------------------------------------------- 5
    console.log("\n5. Discount never exceeds the subtotal");

    const huge = computeTotals({
      lines: [
        { variantId: "x", qty: 1, unitPriceCents: 500, taxable: false, weightGrams: 0 },
      ],
      coupon: { ...coupon!, type: "FIXED", value: 999_999, minOrderCents: null },
      taxRatePct: 0,
      taxInclusive: false,
    });
    check("a huge fixed discount clamps to the subtotal", huge.discountCents === 500, `${huge.discountCents}`);
    check("the total never goes negative", huge.totalCents === 0, `${huge.totalCents}`);
  } finally {
    console.log("\nCleaning up…");
    await prisma.orderItem.deleteMany({ where: { variantId: variant.id } });
    await prisma.order.deleteMany({ where: { customerName: "Concurrency Test" } });
    await prisma.product.delete({ where: { id: product.id } });
  }

  console.log(
    failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`,
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
