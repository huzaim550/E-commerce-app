import { cache } from "react";
import { prisma } from "@/lib/db";
import type { SettingModel } from "@/generated/prisma/models";

export type StoreSettings = SettingModel;

const defaults = {
  id: "default",
  storeName: "My Store",
} as const;

/**
 * Settings are read by nearly every page. `cache` dedupes to one query per
 * request; we deliberately do not use the Next data cache so an admin save is
 * visible immediately with no revalidation dance.
 */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const existing = await prisma.setting.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  // First boot before the seed has run.
  return prisma.setting.create({ data: defaults });
});
