import "server-only";
import { prisma } from "@/lib/db";
import { parseAttributeSchema, parseImages } from "@/lib/types";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Catalog reads shared by the storefront pages. Kept here so the listing,
 * category and search pages can't drift apart in what "a visible product" means.
 */

export const productCardSelect = {
  id: true,
  title: true,
  slug: true,
  images: true,
  basePriceCents: true,
  comparePriceCents: true,
  featured: true,
  category: { select: { name: true, slug: true } },
  variants: {
    where: { active: true },
    select: { priceCents: true, stock: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;

/** Cheapest active variant price, and whether anything is in stock. */
export function cardPricing(product: ProductCardData) {
  const prices = product.variants.map((v) => v.priceCents ?? product.basePriceCents);
  const priceCents = prices.length ? Math.min(...prices) : product.basePriceCents;
  const inStock = product.variants.some((v) => v.stock > 0);
  const hasRange = prices.length > 1 && Math.max(...prices) !== priceCents;

  return { priceCents, inStock, hasRange };
}

export function primaryImage(images: unknown) {
  return parseImages(images)[0] ?? null;
}

export type ProductSort = "newest" | "price-asc" | "price-desc" | "name";

const orderBys: Record<ProductSort, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  "price-asc": { basePriceCents: "asc" },
  "price-desc": { basePriceCents: "desc" },
  name: { title: "asc" },
};

export const sortLabels: Record<ProductSort, string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name: A–Z",
};

export function parseSort(value: string | undefined): ProductSort {
  return value && value in orderBys ? (value as ProductSort) : "newest";
}

export type CatalogQuery = {
  search?: string;
  categorySlug?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  /** Attribute facets: { ram: ["16GB", "32GB"] } */
  attributes?: Record<string, string[]>;
  inStockOnly?: boolean;
  minCents?: number;
  maxCents?: number;
};

export const PER_PAGE = 12;

export async function queryProducts(query: CatalogQuery) {
  const perPage = query.perPage ?? PER_PAGE;
  const page = Math.max(1, query.page ?? 1);

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (query.categorySlug) {
    where.category = { slug: query.categorySlug };
  }

  if (query.search) {
    const term = query.search.trim();
    if (term) {
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { tags: { has: term.toLowerCase() } },
      ];
    }
  }

  if (query.minCents !== undefined || query.maxCents !== undefined) {
    where.basePriceCents = {
      ...(query.minCents !== undefined ? { gte: query.minCents } : {}),
      ...(query.maxCents !== undefined ? { lte: query.maxCents } : {}),
    };
  }

  if (query.inStockOnly) {
    where.variants = { some: { active: true, stock: { gt: 0 } } };
  }

  // Attribute facets are stored in a JSON column. Each selected value is an
  // OR within a field, and fields AND together.
  const attributeEntries = Object.entries(query.attributes ?? {}).filter(
    ([, values]) => values.length > 0,
  );
  if (attributeEntries.length) {
    where.AND = attributeEntries.map(([key, values]) => ({
      OR: values.map((value) => ({
        attributes: { path: [key], equals: value },
      })),
    }));
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: orderBys[query.sort ?? "newest"],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getVisibleCategories() {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      attributeSchema: true,
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      category: true,
      optionGroups: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Same-category products, falling back to featured ones for a lone category. */
export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
) {
  const sameCategory = categoryId
    ? await prisma.product.findMany({
        where: { status: "ACTIVE", categoryId, id: { not: productId } },
        select: productCardSelect,
        take: limit,
        orderBy: { createdAt: "desc" },
      })
    : [];

  if (sameCategory.length >= limit) return sameCategory;

  const filler = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: productId, notIn: sameCategory.map((p) => p.id) },
    },
    select: productCardSelect,
    take: limit - sameCategory.length,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return [...sameCategory, ...filler];
}

/**
 * Facets for a category: every filterable attribute with the values that
 * actually occur on its active products (so we never show a dead filter).
 */
export async function getCategoryFacets(categorySlug: string) {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { attributeSchema: true },
  });
  if (!category) return [];

  const fields = parseAttributeSchema(category.attributeSchema).filter((f) => f.filterable);
  if (!fields.length) return [];

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", category: { slug: categorySlug } },
    select: { attributes: true },
  });

  return fields
    .map((field) => {
      const counts = new Map<string, number>();

      for (const product of products) {
        const raw = (product.attributes as Record<string, unknown>)?.[field.key];
        if (raw === undefined || raw === null || raw === "") continue;
        const values = Array.isArray(raw) ? raw : [raw];
        for (const value of values) {
          const label = field.type === "boolean" ? (value ? "Yes" : "No") : String(value);
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
      }

      return {
        field,
        values: [...counts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true })),
      };
    })
    .filter((facet) => facet.values.length > 1);
}
