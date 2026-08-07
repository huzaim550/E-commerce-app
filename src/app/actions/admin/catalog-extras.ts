"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { uniqueSlug } from "@/lib/utils";
import { parseMoneyToCents } from "@/lib/money";
import {
  couponSchema,
  shippingRateSchema,
  pageSchema,
  failure,
  success,
  fieldErrorsOf,
  type ActionResult,
} from "@/lib/validation";
import { getStorage } from "@/lib/storage";

/** Coupons, shipping rates, content pages and media — the smaller admin CRUDs. */

// ---------------------------------------------------------------- coupons

export async function saveCoupon(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff();

  const original = String(formData.get("originalCode") ?? "");
  const parsed = couponSchema.safeParse({
    ...Object.fromEntries(formData),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  if (input.type === "PERCENT" && (input.value <= 0 || input.value > 100)) {
    return failure("A percentage discount must be between 1 and 100.", {
      value: "Enter 1–100.",
    });
  }

  const data = {
    type: input.type,
    // PERCENT stores a whole percent; FIXED stores minor units.
    value: input.type === "PERCENT" ? Math.round(input.value) : parseMoneyToCents(input.value),
    minOrderCents: input.minOrder ? parseMoneyToCents(input.minOrder) : null,
    maxUses: input.maxUses ? Number(input.maxUses) : null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    active: input.active,
  };

  const code = input.code.toUpperCase();

  try {
    if (original) {
      await prisma.coupon.update({ where: { code: original }, data });
    } else {
      await prisma.coupon.create({ data: { code, ...data } });
    }
  } catch (error) {
    console.error("Coupon save failed:", error);
    return failure("Couldn't save — that code may already exist.");
  }

  revalidatePath("/admin/coupons");
  return success(undefined, "Coupon saved.");
}

export async function deleteCoupon(code: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.coupon.delete({ where: { code } });
  revalidatePath("/admin/coupons");
  return success(undefined, "Coupon deleted.");
}

// ---------------------------------------------------------------- shipping

export async function saveShippingRate(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const parsed = shippingRateSchema.safeParse({
    ...Object.fromEntries(formData),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  if (input.type === "FREE_OVER" && !input.threshold) {
    return failure("A 'free over' rate needs a threshold amount.", {
      threshold: "Enter the order value at which shipping becomes free.",
    });
  }

  const data = {
    name: input.name,
    type: input.type,
    amountCents: parseMoneyToCents(input.amount),
    thresholdCents: input.threshold ? parseMoneyToCents(input.threshold) : null,
    perKgCents: input.perKg ? parseMoneyToCents(input.perKg) : null,
    regions: (input.regions || "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean),
    sortOrder: input.sortOrder,
    active: input.active,
  };

  if (id) {
    await prisma.shippingRate.update({ where: { id }, data });
  } else {
    await prisma.shippingRate.create({ data });
  }

  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
  return success(undefined, "Shipping rate saved.");
}

export async function deleteShippingRate(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.shippingRate.delete({ where: { id } });
  revalidatePath("/admin/shipping");
  return success(undefined, "Shipping rate deleted.");
}

// ---------------------------------------------------------------- pages

export async function savePage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const parsed = pageSchema.safeParse({
    ...Object.fromEntries(formData),
    published: formData.get("published") === "on",
    showInFooter: formData.get("showInFooter") === "on",
  });

  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  const slug = input.slug
    ? input.slug
    : await uniqueSlug(input.title, async (candidate) =>
        Boolean(
          await prisma.page.findFirst({
            where: { slug: candidate, ...(id ? { id: { not: id } } : {}) },
            select: { id: true },
          }),
        ),
      );

  const data = {
    title: input.title,
    slug,
    body: input.body || "",
    published: input.published,
    showInFooter: input.showInFooter,
    sortOrder: input.sortOrder,
    seoDescription: input.seoDescription || null,
  };

  try {
    if (id) {
      await prisma.page.update({ where: { id }, data });
    } else {
      await prisma.page.create({ data });
    }
  } catch (error) {
    console.error("Page save failed:", error);
    return failure("Couldn't save — that slug may already exist.");
  }

  revalidatePath("/", "layout");
  return success(undefined, "Page saved.");
}

export async function deletePage(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.page.delete({ where: { id } });
  revalidatePath("/", "layout");
  return success(undefined, "Page deleted.");
}

// ---------------------------------------------------------------- media

export async function deleteMediaAsset(id: string): Promise<ActionResult> {
  await requireStaff();

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return failure("That file is already gone.");

  const storage = await getStorage();
  await storage.delete(asset.key);
  await prisma.mediaAsset.delete({ where: { id } });

  revalidatePath("/admin/media");
  return success(undefined, "File deleted.");
}
