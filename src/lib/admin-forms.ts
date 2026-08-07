import { centsToInput } from "@/lib/money";
import type { AttributeField, AttributeValues } from "@/lib/types";

/**
 * Shapes and mappers shared between admin Server Components and the client
 * forms they render. These must not live in a "use client" module — the server
 * pages call `toProductFormData` directly, and every export of a client module
 * is a client reference, not a callable function.
 */

export type VariantRow = {
  id?: string;
  name: string;
  options: Record<string, string>;
  price: string;
  sku: string;
  stock: number;
};

export type OptionGroupRow = { name: string; values: string[] };

export type ProductFormData = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId: string;
  basePrice: string;
  comparePrice: string;
  taxable: boolean;
  weightGrams: string;
  featured: boolean;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  images: string[];
  attributes: AttributeValues;
  optionGroups: OptionGroupRow[];
  variants: VariantRow[];
};

export const emptyProduct: ProductFormData = {
  title: "",
  slug: "",
  description: "",
  status: "DRAFT",
  categoryId: "",
  basePrice: "",
  comparePrice: "",
  taxable: true,
  weightGrams: "",
  featured: false,
  tags: "",
  seoTitle: "",
  seoDescription: "",
  images: [],
  attributes: {},
  optionGroups: [],
  variants: [],
};

export function toProductFormData(product: {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  categoryId: string | null;
  basePriceCents: number;
  comparePriceCents: number | null;
  taxable: boolean;
  weightGrams: number | null;
  featured: boolean;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  images: string[];
  attributes: AttributeValues;
  optionGroups: OptionGroupRow[];
  variants: {
    id: string;
    name: string;
    options: Record<string, string>;
    priceCents: number | null;
    sku: string | null;
    stock: number;
  }[];
}): ProductFormData {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    status: product.status,
    categoryId: product.categoryId ?? "",
    basePrice: centsToInput(product.basePriceCents),
    comparePrice: centsToInput(product.comparePriceCents),
    taxable: product.taxable,
    weightGrams: product.weightGrams ? String(product.weightGrams) : "",
    featured: product.featured,
    tags: product.tags.join(", "),
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    images: product.images,
    attributes: product.attributes,
    optionGroups: product.optionGroups,
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      options: v.options,
      price: v.priceCents !== null ? centsToInput(v.priceCents) : "",
      sku: v.sku ?? "",
      stock: v.stock,
    })),
  };
}

export type CategoryFormData = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string;
  sortOrder: number;
  active: boolean;
  attributeSchema: AttributeField[];
};

export const emptyCategory: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  parentId: "",
  sortOrder: 0,
  active: true,
  attributeSchema: [],
};
