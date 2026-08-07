"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { uniqueSlug } from "@/lib/utils";
import { parseMoneyToCents } from "@/lib/money";
import { parseAttributeSchema, type AttributeValues } from "@/lib/types";
import {
  productSchema,
  failure,
  success,
  fieldErrorsOf,
  type ActionResult,
} from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Product CRUD. Every action re-checks staff authorization: Server Actions are
 * POST endpoints reachable without ever loading the admin UI.
 */

type VariantInput = {
  id?: string;
  name: string;
  options: Record<string, string>;
  price: string;
  sku: string;
  stock: number;
};

type OptionGroupInput = {
  name: string;
  values: string[];
};

/** Cartesian product of option groups — the variant matrix generator. */
export async function buildVariantMatrix(
  groups: OptionGroupInput[],
): Promise<{ name: string; options: Record<string, string> }[]> {
  const valid = groups.filter((g) => g.name.trim() && g.values.length > 0);
  if (valid.length === 0) return [{ name: "Default", options: {} }];

  let combos: Record<string, string>[] = [{}];
  for (const group of valid) {
    combos = combos.flatMap((combo) =>
      group.values.map((value) => ({ ...combo, [group.name]: value })),
    );
  }

  return combos.map((options) => ({
    name: Object.values(options).join(" / "),
    options,
  }));
}

function readAttributes(formData: FormData, schemaJson: unknown): AttributeValues {
  const fields = parseAttributeSchema(schemaJson);
  const values: AttributeValues = {};

  for (const field of fields) {
    const key = `attr_${field.key}`;

    if (field.type === "multiselect") {
      const selected = formData.getAll(key).map(String).filter(Boolean);
      if (selected.length) values[field.key] = selected;
      continue;
    }

    const raw = formData.get(key);
    if (raw === null || raw === "") continue;

    if (field.type === "boolean") {
      values[field.key] = raw === "on" || raw === "true";
    } else if (field.type === "number") {
      const num = Number(raw);
      if (Number.isFinite(num)) values[field.key] = num;
    } else {
      values[field.key] = String(raw);
    }
  }

  // Unchecked boolean checkboxes don't post at all — record them as false.
  for (const field of fields) {
    if (field.type === "boolean" && !(field.key in values)) {
      values[field.key] = false;
    }
  }

  return values;
}

function readJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveProduct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse({
    ...Object.fromEntries(formData),
    taxable: formData.get("taxable") === "on",
    featured: formData.get("featured") === "on",
  });

  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  const basePriceCents = parseMoneyToCents(input.basePrice);
  if (basePriceCents <= 0) {
    return failure("Price must be greater than zero.", {
      basePrice: "Enter a price above zero.",
    });
  }

  const categoryId = input.categoryId || null;
  const category = categoryId
    ? await prisma.category.findUnique({
        where: { id: categoryId },
        select: { attributeSchema: true },
      })
    : null;

  const images = readJsonField<string[]>(formData, "images", []);
  const optionGroups = readJsonField<OptionGroupInput[]>(formData, "optionGroups", []);
  const variants = readJsonField<VariantInput[]>(formData, "variants", []);

  const slug = input.slug
    ? input.slug
    : await uniqueSlug(input.title, async (candidate) =>
        Boolean(
          await prisma.product.findFirst({
            where: { slug: candidate, ...(id ? { id: { not: id } } : {}) },
            select: { id: true },
          }),
        ),
      );

  const data = {
    title: input.title,
    slug,
    description: input.description || "",
    status: input.status,
    categoryId,
    images: images as Prisma.InputJsonValue,
    attributes: readAttributes(formData, category?.attributeSchema) as Prisma.InputJsonValue,
    tags: (input.tags || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    basePriceCents,
    comparePriceCents: input.comparePrice ? parseMoneyToCents(input.comparePrice) : null,
    taxable: input.taxable,
    weightGrams: input.weightGrams || null,
    featured: input.featured,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
  };

  let productId = id;

  try {
    if (id) {
      await prisma.product.update({ where: { id }, data });
    } else {
      const created = await prisma.product.create({ data });
      productId = created.id;
    }
  } catch (error) {
    console.error("Product save failed:", error);
    return failure("Couldn't save the product — is that slug already taken?");
  }

  // Option groups: replace wholesale, they're small and fully admin-controlled.
  await prisma.optionGroup.deleteMany({ where: { productId } });
  for (const [index, group] of optionGroups.entries()) {
    if (!group.name.trim() || group.values.length === 0) continue;
    await prisma.optionGroup.create({
      data: {
        productId,
        name: group.name.trim(),
        values: group.values,
        sortOrder: index,
      },
    });
  }

  // Variants are updated in place where possible so stock and IDs survive edits
  // (order history references variant IDs).
  const existing = await prisma.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const keptIds = new Set(variants.map((v) => v.id).filter(Boolean) as string[]);

  const removable = existing.filter((v) => !keptIds.has(v.id)).map((v) => v.id);
  if (removable.length) {
    // Soft-delete rather than destroy: a variant may sit in someone's cart.
    await prisma.productVariant.updateMany({
      where: { id: { in: removable } },
      data: { active: false },
    });
  }

  const effectiveVariants = variants.length
    ? variants
    : [{ name: "Default", options: {}, price: "", sku: "", stock: 0 }];

  for (const [index, variant] of effectiveVariants.entries()) {
    const variantData = {
      name: variant.name || "Default",
      options: variant.options as Prisma.InputJsonValue,
      priceCents: variant.price ? parseMoneyToCents(variant.price) : null,
      sku: variant.sku || null,
      stock: Math.max(0, Math.floor(Number(variant.stock) || 0)),
      sortOrder: index,
      active: true,
    };

    if (variant.id) {
      await prisma.productVariant.update({ where: { id: variant.id }, data: variantData });
    } else {
      await prisma.productVariant.create({ data: { ...variantData, productId } });
    }
  }

  revalidatePath("/", "layout");

  if (!id) redirect(`/admin/products/${productId}`);
  return success(undefined, "Product saved.");
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireStaff();

  const orderCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderCount > 0) {
    // Keep order history intact; archiving hides it from the storefront anyway.
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    revalidatePath("/", "layout");
    return success(undefined, "Product has orders, so it was archived instead of deleted.");
  }

  await prisma.product.delete({ where: { id } });
  revalidatePath("/", "layout");
  return success(undefined, "Product deleted.");
}

export async function duplicateProduct(id: string): Promise<ActionResult> {
  await requireStaff();

  const source = await prisma.product.findUnique({
    where: { id },
    include: { optionGroups: true, variants: { where: { active: true } } },
  });
  if (!source) return failure("Product not found.");

  const slug = await uniqueSlug(`${source.slug}-copy`, async (candidate) =>
    Boolean(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );

  const copy = await prisma.product.create({
    data: {
      title: `${source.title} (copy)`,
      slug,
      description: source.description,
      status: "DRAFT",
      categoryId: source.categoryId,
      images: source.images as Prisma.InputJsonValue,
      attributes: source.attributes as Prisma.InputJsonValue,
      tags: source.tags,
      basePriceCents: source.basePriceCents,
      comparePriceCents: source.comparePriceCents,
      taxable: source.taxable,
      weightGrams: source.weightGrams,
      optionGroups: {
        create: source.optionGroups.map((g) => ({
          name: g.name,
          values: g.values,
          sortOrder: g.sortOrder,
        })),
      },
      variants: {
        create: source.variants.map((v) => ({
          name: v.name,
          options: v.options as Prisma.InputJsonValue,
          priceCents: v.priceCents,
          // SKUs must stay unique; the admin re-enters them.
          sku: null,
          stock: 0,
          sortOrder: v.sortOrder,
        })),
      },
    },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${copy.id}`);
}
