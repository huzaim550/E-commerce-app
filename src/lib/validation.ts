import { z } from "zod";
import { addressSchema } from "@/lib/types";

/** Shared by Server Actions and the forms that call them. */

export const loginSchema = z.object({
  email: z.email("Enter a valid email").max(200),
  password: z.string().min(1, "Password is required").max(200),
});

export const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.email("Enter a valid email").max(200),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required").max(120),
  phone: z.string().min(5, "Phone number is required").max(40),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional(),
  note: z.string().max(1000).optional().or(z.literal("")),
  shippingRateId: z.string().optional().or(z.literal("")),
  couponCode: z.string().max(50).optional().or(z.literal("")),
  paymentMethod: z.enum(["COD", "MANUAL"]).default("COD"),
  ...addressSchema.shape,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  slug: z.string().max(120).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(20000).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  categoryId: z.string().optional().or(z.literal("")),
  basePrice: z.string().min(1, "Price is required"),
  comparePrice: z.string().optional().or(z.literal("")),
  taxable: z.boolean().default(true),
  weightGrams: z.coerce.number().int().min(0).max(1_000_000).optional(),
  featured: z.boolean().default(false),
  tags: z.string().max(500).optional().or(z.literal("")),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(400).optional().or(z.literal("")),
});

export const couponSchema = z.object({
  code: z
    .string()
    .min(2, "Code is required")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes and underscores only"),
  type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
  value: z.coerce.number().min(0, "Value must be positive"),
  minOrder: z.string().optional().or(z.literal("")),
  maxUses: z.string().optional().or(z.literal("")),
  startsAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export const shippingRateSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  type: z.enum(["FLAT", "FREE_OVER", "WEIGHT"]).default("FLAT"),
  amount: z.string().default("0"),
  threshold: z.string().optional().or(z.literal("")),
  perKg: z.string().optional().or(z.literal("")),
  regions: z.string().max(500).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  active: z.boolean().default(true),
});

export const pageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().max(200).optional().or(z.literal("")),
  body: z.string().max(50000).optional().or(z.literal("")),
  published: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  seoDescription: z.string().max(400).optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(120),
  tagline: z.string().max(200).optional().or(z.literal("")),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
  faviconUrl: z.string().max(500).optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1f2937"),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #2563eb"),
  fontFamily: z.enum(["sans", "serif", "mono"]).default("sans"),
  currency: z.string().min(3).max(8),
  currencySymbol: z.string().min(1).max(6),
  locale: z.string().min(2).max(20),
  taxRatePct: z.coerce.number().min(0).max(100).default(0),
  taxInclusive: z.boolean().default(false),
  contactEmail: z.string().max(200).optional().or(z.literal("")),
  contactPhone: z.string().max(60).optional().or(z.literal("")),
  contactAddress: z.string().max(300).optional().or(z.literal("")),
  orderPrefix: z.string().min(1).max(8).default("ORD"),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(400).optional().or(z.literal("")),
});

/** Shape every Server Action returns, so forms handle results uniformly. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function failure(error: string, fieldErrors?: Record<string, string>) {
  return { ok: false as const, error, fieldErrors };
}

export function success<T>(data?: T, message?: string) {
  return { ok: true as const, data, message };
}
