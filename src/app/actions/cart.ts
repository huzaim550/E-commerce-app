"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateCart, MAX_QTY_PER_LINE } from "@/lib/cart";
import { failure, success, type ActionResult } from "@/lib/validation";

/**
 * Cart mutations. Quantities are always clamped against live stock here — the
 * client can ask for any number, it just won't get it.
 */

export async function addToCart(
  variantId: string,
  qty = 1,
): Promise<ActionResult<{ count: number }>> {
  if (!variantId) return failure("Choose an option first.");

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      stock: true,
      active: true,
      product: { select: { status: true, title: true } },
    },
  });

  if (!variant || !variant.active || variant.product.status !== "ACTIVE") {
    return failure("That item is no longer available.");
  }
  if (variant.stock < 1) {
    return failure("That option is out of stock.");
  }

  const cart = await getOrCreateCart();
  const existing = cart.items.find((item) => item.variantId === variantId);
  const requested = (existing?.qty ?? 0) + Math.max(1, qty);
  const finalQty = Math.min(requested, variant.stock, MAX_QTY_PER_LINE);

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { qty: finalQty },
    create: { cartId: cart.id, variantId, qty: finalQty },
  });

  revalidatePath("/", "layout");

  const capped = finalQty < requested;
  return success(
    { count: finalQty },
    capped
      ? `Only ${variant.stock} left — cart updated to ${finalQty}.`
      : `Added to cart.`,
  );
}

/**
 * Form-submission wrapper around `addToCart`.
 *
 * The product page submits a real <form>, not an onClick handler, so the
 * button works the moment the HTML paints: React replays submissions that
 * happen before hydration finishes, and with JavaScript off the browser does a
 * plain POST. Hydration can take seconds on a cold dev compile, and a button
 * that silently does nothing in that window looks broken.
 */
export async function addToCartAction(
  _prev: ActionResult<{ count: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  const variantId = String(formData.get("variantId") ?? "");
  const qty = Number(formData.get("qty") ?? 1);

  return addToCart(variantId, Number.isFinite(qty) && qty > 0 ? qty : 1);
}

export async function updateCartItem(
  itemId: string,
  qty: number,
): Promise<ActionResult> {
  const cart = await getOrCreateCart();
  const item = cart.items.find((i) => i.id === itemId);
  // Scoped to this cart's items so an itemId from elsewhere does nothing.
  if (!item) return failure("That item is no longer in your cart.");

  if (qty <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    revalidatePath("/", "layout");
    return success(undefined, "Removed from cart.");
  }

  const finalQty = Math.min(qty, item.variant.stock, MAX_QTY_PER_LINE);
  await prisma.cartItem.update({ where: { id: itemId }, data: { qty: finalQty } });

  revalidatePath("/", "layout");
  return success(
    undefined,
    finalQty < qty ? `Only ${item.variant.stock} available.` : undefined,
  );
}

export async function removeCartItem(itemId: string): Promise<ActionResult> {
  const cart = await getOrCreateCart();
  if (!cart.items.some((i) => i.id === itemId)) {
    return failure("That item is no longer in your cart.");
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/", "layout");
  return success(undefined, "Removed from cart.");
}
