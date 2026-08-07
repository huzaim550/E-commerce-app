"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { homeSectionSchema, socialsSchema } from "@/lib/types";
import { z } from "zod";
import {
  settingsSchema,
  failure,
  success,
  fieldErrorsOf,
  type ActionResult,
} from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

export async function saveSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff();

  const parsed = settingsSchema.safeParse({
    ...Object.fromEntries(formData),
    taxInclusive: formData.get("taxInclusive") === "on",
  });

  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  const socials = socialsSchema.safeParse({
    instagram: String(formData.get("social_instagram") ?? ""),
    facebook: String(formData.get("social_facebook") ?? ""),
    x: String(formData.get("social_x") ?? ""),
    tiktok: String(formData.get("social_tiktok") ?? ""),
    whatsapp: String(formData.get("social_whatsapp") ?? ""),
    youtube: String(formData.get("social_youtube") ?? ""),
  });

  await prisma.setting.update({
    where: { id: "default" },
    data: {
      storeName: input.storeName,
      tagline: input.tagline || null,
      logoUrl: input.logoUrl || null,
      faviconUrl: input.faviconUrl || null,
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      fontFamily: input.fontFamily,
      currency: input.currency.toUpperCase(),
      currencySymbol: input.currencySymbol,
      locale: input.locale,
      taxRatePct: input.taxRatePct,
      taxInclusive: input.taxInclusive,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      contactAddress: input.contactAddress || null,
      orderPrefix: input.orderPrefix.toUpperCase(),
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      socials: (socials.success
        ? Object.fromEntries(
            Object.entries(socials.data).filter(([, value]) => Boolean(value)),
          )
        : {}) as Prisma.InputJsonValue,
    },
  });

  // Theme colours and store name live in the root layout, so everything re-renders.
  revalidatePath("/", "layout");
  return success(undefined, "Settings saved.");
}

export async function saveHomeSections(sectionsJson: string): Promise<ActionResult> {
  await requireStaff();

  let parsed: unknown;
  try {
    parsed = JSON.parse(sectionsJson);
  } catch {
    return failure("Couldn't read the homepage layout.");
  }

  const validated = z.array(homeSectionSchema).safeParse(parsed);
  if (!validated.success) {
    return failure("One of the homepage sections is invalid.");
  }

  await prisma.setting.update({
    where: { id: "default" },
    data: { homeSections: validated.data as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/", "layout");
  return success(undefined, "Homepage updated.");
}
