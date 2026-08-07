import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseImages, parseOptions } from "@/lib/types";
import type { PricedLine } from "@/lib/pricing";

const COOKIE = "cart_token";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days
export const MAX_QTY_PER_LINE = 99;

/**
 * The cart lives server-side keyed by an opaque cookie token, so prices and
 * stock are always re-read from the database rather than trusted from the
 * client.
 */

export type CartLine = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  options: Record<string, string>;
  image: string | null;
  unitPriceCents: number;
  qty: number;
  stock: number;
  taxable: boolean;
  weightGrams: number;
  lineTotalCents: number;
};

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: true,
              basePriceCents: true,
              taxable: true,
              weightGrams: true,
              status: true,
            },
          },
        },
      },
    },
  },
} as const;

async function findCartByToken(token: string | undefined) {
  if (!token) return null;
  return prisma.cart.findUnique({ where: { token }, include: cartInclude });
}

/** Read-only: never creates a cart, so GET renders stay side-effect free. */
export const getCart = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  return findCartByToken(token);
});

/**
 * For mutations only — it sets a cookie, which Next allows just in Server
 * Actions and Route Handlers.
 */
export async function getOrCreateCart() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;

  const existing = await findCartByToken(token);
  if (existing) return existing;

  const newToken = crypto.randomUUID();
  const cart = await prisma.cart.create({
    data: { token: newToken },
    include: cartInclude,
  });

  store.set(COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  return cart;
}

type LoadedCart = NonNullable<Awaited<ReturnType<typeof getCart>>>;

/** Flattens a cart into display lines, dropping anything no longer purchasable. */
export function toCartLines(cart: LoadedCart | null): CartLine[] {
  if (!cart) return [];

  return cart.items
    .filter((item) => item.variant.active && item.variant.product.status === "ACTIVE")
    .map((item) => {
      const { variant } = item;
      const { product } = variant;
      const unitPriceCents = variant.priceCents ?? product.basePriceCents;
      // Never show more than we can actually ship.
      const qty = Math.min(item.qty, variant.stock);

      return {
        id: item.id,
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        title: product.title,
        options: parseOptions(variant.options),
        image: variant.imageUrl ?? parseImages(product.images)[0] ?? null,
        unitPriceCents,
        qty,
        stock: variant.stock,
        taxable: product.taxable,
        weightGrams: product.weightGrams ?? 0,
        lineTotalCents: unitPriceCents * qty,
      };
    })
    .filter((line) => line.qty > 0);
}

export function toPricedLines(lines: CartLine[]): PricedLine[] {
  return lines.map((line) => ({
    variantId: line.variantId,
    qty: line.qty,
    unitPriceCents: line.unitPriceCents,
    taxable: line.taxable,
    weightGrams: line.weightGrams,
  }));
}

/** Badge count for the header. */
export async function getCartCount() {
  const cart = await getCart();
  return toCartLines(cart).reduce((sum, line) => sum + line.qty, 0);
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}
