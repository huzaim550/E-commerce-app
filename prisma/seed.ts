import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";

/**
 * Idempotent demo data. The two categories are deliberately unalike — a
 * laptop shop and a clothing brand — because the whole premise of this store
 * is that both fit without a schema change.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const img = (seed: string, w = 900, h = 900) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";

  // ------------------------------------------------------------ admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Store Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`✓ admin: ${admin.email}`);

  // ------------------------------------------------------------ settings
  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "Nova Store",
      tagline: "Carefully chosen things, delivered fast.",
      primaryColor: "#111827",
      accentColor: "#2563eb",
      currency: "USD",
      currencySymbol: "$",
      locale: "en-US",
      taxRatePct: 0,
      contactEmail: "hello@novastore.test",
      contactPhone: "+1 555 0100",
      contactAddress: "12 Market Street, Springfield",
      socials: { instagram: "https://instagram.com", facebook: "https://facebook.com" },
      seoTitle: "Nova Store — Carefully chosen things",
      seoDescription: "A small, fast store you can make your own.",
      homeSections: [
        {
          id: "hero-1",
          type: "hero",
          enabled: true,
          props: {
            heading: "Everything you need, nothing you don't",
            subheading:
              "A demo storefront you can reshape for any kind of product from the admin panel.",
            ctaLabel: "Shop all products",
            ctaHref: "/products",
            imageUrl: img("nova-hero", 1600, 900),
          },
        },
        {
          id: "categories-1",
          type: "categoryGrid",
          enabled: true,
          props: { heading: "Shop by category" },
        },
        {
          id: "featured-1",
          type: "featured",
          enabled: true,
          props: { heading: "Featured", limit: 4 },
        },
        {
          id: "banner-1",
          type: "banner",
          enabled: true,
          props: {
            heading: "Free delivery over $150",
            body: "Every order ships within one business day.",
            ctaLabel: "Browse the catalogue",
            ctaHref: "/products",
          },
        },
      ],
    },
  });
  console.log("✓ settings");

  // ------------------------------------------------------------ categories
  // Two very different attribute schemas, on purpose.
  const laptops = await prisma.category.upsert({
    where: { slug: "laptops" },
    update: {},
    create: {
      name: "Laptops",
      slug: "laptops",
      description: "Portable machines for work and play.",
      imageUrl: img("cat-laptops", 800, 600),
      sortOrder: 1,
      attributeSchema: [
        {
          key: "ram",
          label: "RAM",
          type: "select",
          options: ["8GB", "16GB", "32GB"],
          required: true,
          filterable: true,
        },
        { key: "cpu", label: "Processor", type: "text", options: [], required: true, filterable: false },
        { key: "screen", label: "Screen size", type: "number", options: [], unit: "in", required: false, filterable: true },
        { key: "touchscreen", label: "Touchscreen", type: "boolean", options: [], required: false, filterable: true },
      ],
    },
  });

  const apparel = await prisma.category.upsert({
    where: { slug: "apparel" },
    update: {},
    create: {
      name: "Apparel",
      slug: "apparel",
      description: "Everyday clothing, made to last.",
      imageUrl: img("cat-apparel", 800, 600),
      sortOrder: 2,
      attributeSchema: [
        {
          key: "fabric",
          label: "Fabric",
          type: "select",
          options: ["Cotton", "Linen", "Wool", "Blend"],
          required: true,
          filterable: true,
        },
        {
          key: "fit",
          label: "Fit",
          type: "select",
          options: ["Slim", "Regular", "Relaxed"],
          required: false,
          filterable: true,
        },
        {
          key: "care",
          label: "Care",
          type: "multiselect",
          options: ["Machine wash", "Hand wash", "Tumble dry", "Iron low"],
          required: false,
          filterable: false,
        },
      ],
    },
  });

  const accessories = await prisma.category.upsert({
    where: { slug: "accessories" },
    update: {},
    create: {
      name: "Accessories",
      slug: "accessories",
      description: "The small things that finish the setup.",
      imageUrl: img("cat-accessories", 800, 600),
      sortOrder: 3,
      attributeSchema: [
        { key: "material", label: "Material", type: "text", options: [], required: false, filterable: true },
        { key: "warranty", label: "Warranty", type: "number", options: [], unit: "months", required: false, filterable: false },
      ],
    },
  });
  console.log("✓ categories");

  // ------------------------------------------------------------ products
  type SeedProduct = {
    slug: string;
    title: string;
    description: string;
    categoryId: string;
    basePriceCents: number;
    comparePriceCents?: number;
    images: string[];
    attributes: Prisma.InputJsonValue;
    tags: string[];
    featured?: boolean;
    weightGrams?: number;
    optionGroups?: { name: string; values: string[] }[];
    variants: {
      name: string;
      options: Record<string, string>;
      priceCents?: number;
      stock: number;
      sku: string;
    }[];
  };

  const products: SeedProduct[] = [
    {
      slug: "aurora-14-ultrabook",
      title: "Aurora 14 Ultrabook",
      description:
        "A 1.2kg aluminium ultrabook with a 14-inch display.\n\nBuilt for people who work in coffee shops and airports: all-day battery, a genuinely good keyboard, and enough ports that you can leave the dongles at home.",
      categoryId: laptops.id,
      basePriceCents: 129900,
      comparePriceCents: 149900,
      images: [img("aurora-1"), img("aurora-2"), img("aurora-3")],
      attributes: { ram: "16GB", cpu: "Intel Core Ultra 7", screen: 14, touchscreen: false },
      tags: ["ultrabook", "portable"],
      featured: true,
      weightGrams: 1200,
      optionGroups: [{ name: "Storage", values: ["512GB", "1TB"] }],
      variants: [
        { name: "512GB", options: { Storage: "512GB" }, stock: 12, sku: "AUR14-512" },
        { name: "1TB", options: { Storage: "1TB" }, priceCents: 149900, stock: 6, sku: "AUR14-1TB" },
      ],
    },
    {
      slug: "meridian-16-creator",
      title: "Meridian 16 Creator",
      description:
        "A 16-inch workstation with a colour-accurate display and a discrete GPU.\n\nIntended for video editing and 3D work — it is heavier than the Aurora and makes no apology for it.",
      categoryId: laptops.id,
      basePriceCents: 219900,
      images: [img("meridian-1"), img("meridian-2")],
      attributes: { ram: "32GB", cpu: "AMD Ryzen 9", screen: 16, touchscreen: true },
      tags: ["workstation", "creator"],
      featured: true,
      weightGrams: 2100,
      variants: [{ name: "Default", options: {}, stock: 4, sku: "MER16" }],
    },
    {
      slug: "everyday-oxford-shirt",
      title: "Everyday Oxford Shirt",
      description:
        "A washed cotton oxford that gets better with age.\n\nCut a little roomier through the body so it works untucked.",
      categoryId: apparel.id,
      basePriceCents: 6900,
      comparePriceCents: 8900,
      images: [img("oxford-1"), img("oxford-2")],
      attributes: { fabric: "Cotton", fit: "Regular", care: ["Machine wash", "Iron low"] },
      tags: ["shirt", "cotton"],
      featured: true,
      weightGrams: 350,
      // The variant-matrix case: 3 sizes x 2 colours = 6 variants.
      optionGroups: [
        { name: "Size", values: ["S", "M", "L"] },
        { name: "Colour", values: ["White", "Blue"] },
      ],
      variants: [
        { name: "S / White", options: { Size: "S", Colour: "White" }, stock: 8, sku: "OXF-S-WHT" },
        { name: "M / White", options: { Size: "M", Colour: "White" }, stock: 14, sku: "OXF-M-WHT" },
        { name: "L / White", options: { Size: "L", Colour: "White" }, stock: 5, sku: "OXF-L-WHT" },
        { name: "S / Blue", options: { Size: "S", Colour: "Blue" }, stock: 3, sku: "OXF-S-BLU" },
        { name: "M / Blue", options: { Size: "M", Colour: "Blue" }, stock: 0, sku: "OXF-M-BLU" },
        { name: "L / Blue", options: { Size: "L", Colour: "Blue" }, stock: 9, sku: "OXF-L-BLU" },
      ],
    },
    {
      slug: "merino-crew-sweater",
      title: "Merino Crew Sweater",
      description: "Fine-gauge merino, warm without the bulk. Holds its shape after washing.",
      categoryId: apparel.id,
      basePriceCents: 11900,
      images: [img("merino-1"), img("merino-2")],
      attributes: { fabric: "Wool", fit: "Slim", care: ["Hand wash"] },
      tags: ["sweater", "wool"],
      weightGrams: 420,
      optionGroups: [{ name: "Size", values: ["S", "M", "L", "XL"] }],
      variants: [
        { name: "S", options: { Size: "S" }, stock: 6, sku: "MER-S" },
        { name: "M", options: { Size: "M" }, stock: 11, sku: "MER-M" },
        { name: "L", options: { Size: "L" }, stock: 7, sku: "MER-L" },
        { name: "XL", options: { Size: "XL" }, stock: 2, sku: "MER-XL" },
      ],
    },
    {
      slug: "linen-summer-trousers",
      title: "Linen Summer Trousers",
      description: "Loose-cut linen trousers with a drawstring waist. They will wrinkle; that's linen.",
      categoryId: apparel.id,
      basePriceCents: 8500,
      images: [img("linen-1")],
      attributes: { fabric: "Linen", fit: "Relaxed", care: ["Machine wash", "Tumble dry"] },
      tags: ["trousers", "summer"],
      weightGrams: 300,
      optionGroups: [{ name: "Size", values: ["30", "32", "34", "36"] }],
      variants: [
        { name: "30", options: { Size: "30" }, stock: 4, sku: "LIN-30" },
        { name: "32", options: { Size: "32" }, stock: 9, sku: "LIN-32" },
        { name: "34", options: { Size: "34" }, stock: 6, sku: "LIN-34" },
        { name: "36", options: { Size: "36" }, stock: 3, sku: "LIN-36" },
      ],
    },
    {
      slug: "canvas-laptop-sleeve",
      title: "Canvas Laptop Sleeve",
      description: "Waxed canvas outer, felt lining, magnetic closure. Fits up to a 16-inch machine.",
      categoryId: accessories.id,
      basePriceCents: 4500,
      images: [img("sleeve-1"), img("sleeve-2")],
      attributes: { material: "Waxed canvas", warranty: 24 },
      tags: ["sleeve", "bag"],
      featured: true,
      weightGrams: 280,
      optionGroups: [{ name: "Size", values: ["14 inch", "16 inch"] }],
      variants: [
        { name: '14"', options: { Size: "14 inch" }, stock: 20, sku: "SLV-14" },
        { name: '16"', options: { Size: "16 inch" }, priceCents: 4900, stock: 15, sku: "SLV-16" },
      ],
    },
    {
      slug: "low-profile-keyboard",
      title: "Low-Profile Mechanical Keyboard",
      description: "75% layout, hot-swappable switches, USB-C. Quiet enough for an open office.",
      categoryId: accessories.id,
      basePriceCents: 13900,
      comparePriceCents: 15900,
      images: [img("keyboard-1"), img("keyboard-2")],
      attributes: { material: "Aluminium", warranty: 12 },
      tags: ["keyboard", "desk"],
      weightGrams: 780,
      optionGroups: [{ name: "Switch", values: ["Tactile", "Linear"] }],
      variants: [
        { name: "Tactile", options: { Switch: "Tactile" }, stock: 10, sku: "KBD-TAC" },
        { name: "Linear", options: { Switch: "Linear" }, stock: 7, sku: "KBD-LIN" },
      ],
    },
    {
      slug: "aluminium-laptop-stand",
      title: "Aluminium Laptop Stand",
      description: "Raises your screen to eye level and folds flat for travel.",
      categoryId: accessories.id,
      basePriceCents: 3900,
      images: [img("stand-1")],
      attributes: { material: "Anodised aluminium", warranty: 12 },
      tags: ["stand", "desk", "ergonomics"],
      weightGrams: 640,
      variants: [{ name: "Default", options: {}, stock: 25, sku: "STD-01" }],
    },
  ];

  for (const p of products) {
    const { optionGroups, variants, ...rest } = p;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...rest,
        status: "ACTIVE",
        seoDescription: p.description.split("\n")[0].slice(0, 200),
      },
    });

    for (const [index, group] of (optionGroups ?? []).entries()) {
      await prisma.optionGroup.upsert({
        where: { productId_name: { productId: product.id, name: group.name } },
        update: { values: group.values, sortOrder: index },
        create: {
          productId: product.id,
          name: group.name,
          values: group.values,
          sortOrder: index,
        },
      });
    }

    for (const [index, variant] of variants.entries()) {
      await prisma.productVariant.upsert({
        where: { productId_sku: { productId: product.id, sku: variant.sku } },
        update: { stock: variant.stock },
        create: {
          productId: product.id,
          name: variant.name,
          options: variant.options,
          priceCents: variant.priceCents ?? null,
          sku: variant.sku,
          stock: variant.stock,
          sortOrder: index,
        },
      });
    }
  }
  console.log(`✓ ${products.length} products`);

  // ------------------------------------------------------------ shipping & coupons
  const rates = [
    { name: "Standard delivery", type: "FLAT" as const, amountCents: 599, sortOrder: 1 },
    {
      name: "Free over $150",
      type: "FREE_OVER" as const,
      amountCents: 599,
      thresholdCents: 15000,
      sortOrder: 0,
    },
    { name: "Express (next day)", type: "FLAT" as const, amountCents: 1499, sortOrder: 2 },
  ];

  for (const rate of rates) {
    const existing = await prisma.shippingRate.findFirst({ where: { name: rate.name } });
    if (!existing) await prisma.shippingRate.create({ data: rate });
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", type: "PERCENT", value: 10, minOrderCents: 5000 },
  });
  await prisma.coupon.upsert({
    where: { code: "SAVE20" },
    update: {},
    create: { code: "SAVE20", type: "FIXED", value: 2000, minOrderCents: 10000, maxUses: 100 },
  });
  console.log("✓ shipping rates + coupons");

  // ------------------------------------------------------------ content pages
  const pages = [
    {
      slug: "about",
      title: "About us",
      sortOrder: 1,
      body: "## About Nova Store\n\nWe are a small team that sells a carefully edited range of products.\n\nThis page is markdown, editable from **Admin → Pages**. Delete it, rename it, or write your own.",
    },
    {
      slug: "shipping",
      title: "Shipping & delivery",
      sortOrder: 2,
      body: "## Shipping\n\nOrders placed before 3pm ship the same working day.\n\n| Method | Time | Cost |\n| --- | --- | --- |\n| Standard | 3–5 days | $5.99 |\n| Express | Next day | $14.99 |\n\nOrders over $150 ship free.",
    },
    {
      slug: "returns",
      title: "Returns",
      sortOrder: 3,
      body: "## Returns\n\nYou can return anything unused within 30 days for a full refund.\n\nEmail us and we'll send a return label.",
    },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }
  console.log(`✓ ${pages.length} pages`);

  console.log(`\nSeeded. Sign in at /admin/login with ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
