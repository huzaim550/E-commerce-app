import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const base = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = base();

  const [products, categories, pages] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: root, changeFrequency: "daily", priority: 1 },
    { url: `${root}/products`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${root}/c/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${root}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pages.map((p) => ({
      url: `${root}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
