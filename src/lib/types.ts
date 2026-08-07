import { z } from "zod";

// ---------------------------------------------------------------- attributes
// Category.attributeSchema drives the admin product form, the PDP spec table,
// and the storefront facets. This is the contract for all three.

export const attributeTypes = [
  "text",
  "number",
  "select",
  "multiselect",
  "boolean",
] as const;

export type AttributeType = (typeof attributeTypes)[number];

export const attributeFieldSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  type: z.enum(attributeTypes),
  options: z.array(z.string()).default([]),
  unit: z.string().max(12).optional(),
  required: z.boolean().default(false),
  filterable: z.boolean().default(false),
});

export type AttributeField = z.infer<typeof attributeFieldSchema>;

export const attributeSchemaSchema = z.array(attributeFieldSchema).default([]);

export function parseAttributeSchema(value: unknown): AttributeField[] {
  const result = attributeSchemaSchema.safeParse(value);
  return result.success ? result.data : [];
}

/** Attribute values as stored on Product.attributes. */
export type AttributeValues = Record<string, string | number | boolean | string[]>;

export function parseAttributeValues(value: unknown): AttributeValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as AttributeValues;
}

/** Renders one attribute value for display, respecting its declared type. */
export function formatAttributeValue(
  field: AttributeField,
  value: AttributeValues[string] | undefined,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "multiselect") {
    const list = Array.isArray(value) ? value : [String(value)];
    return list.length ? list.join(", ") : null;
  }
  const text = String(value);
  return field.unit ? `${text} ${field.unit}` : text;
}

// ---------------------------------------------------------------- home sections

export const sectionTypes = [
  "hero",
  "featured",
  "categoryGrid",
  "banner",
  "richText",
] as const;

export type SectionType = (typeof sectionTypes)[number];

export const homeSectionSchema = z.object({
  id: z.string(),
  type: z.enum(sectionTypes),
  enabled: z.boolean().default(true),
  props: z.record(z.string(), z.unknown()).default({}),
});

export type HomeSection = z.infer<typeof homeSectionSchema>;

export function parseHomeSections(value: unknown): HomeSection[] {
  const result = z.array(homeSectionSchema).safeParse(value);
  return result.success ? result.data : [];
}

export const sectionLabels: Record<SectionType, string> = {
  hero: "Hero banner",
  featured: "Featured products",
  categoryGrid: "Category grid",
  banner: "Promo banner",
  richText: "Text block",
};

// ---------------------------------------------------------------- misc shapes

export const addressSchema = z.object({
  line1: z.string().min(1, "Address is required").max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(80),
  region: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
});

export type Address = z.infer<typeof addressSchema>;

export function formatAddress(value: unknown): string {
  const parsed = addressSchema.safeParse(value);
  if (!parsed.success) return "";
  const a = parsed.data;
  return [a.line1, a.line2, a.city, a.region, a.postalCode, a.country]
    .filter(Boolean)
    .join(", ");
}

export const socialsSchema = z
  .object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    x: z.string().optional(),
    tiktok: z.string().optional(),
    whatsapp: z.string().optional(),
    youtube: z.string().optional(),
  })
  .partial();

export type Socials = z.infer<typeof socialsSchema>;

export function parseSocials(value: unknown): Socials {
  const result = socialsSchema.safeParse(value);
  return result.success ? result.data : {};
}

/** Product.images is Json; always read it through this. */
export function parseImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

/** ProductVariant.options is Json; always read it through this. */
export function parseOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function describeOptions(options: Record<string, string>) {
  return Object.entries(options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}
