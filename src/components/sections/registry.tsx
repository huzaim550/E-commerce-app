import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getVisibleCategories, productCardSelect } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { ButtonLink } from "@/components/ui";
import type { HomeSection, SectionType } from "@/lib/types";
import { Markdown } from "@/components/store/markdown";

/**
 * The homepage is `Setting.homeSections` — an ordered array of { type, props }
 * that the admin edits. This registry maps each type to a component; adding a
 * new section type means adding a renderer here and an entry in
 * `sectionFieldDefs` (admin/settings) and nothing else.
 */

function str(props: Record<string, unknown>, key: string, fallback = "") {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
}

function num(props: Record<string, unknown>, key: string, fallback: number) {
  const value = props[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ---------------------------------------------------------------- hero

async function Hero({ props }: { props: Record<string, unknown> }) {
  const heading = str(props, "heading", "Welcome to the store");
  const subheading = str(props, "subheading");
  const ctaLabel = str(props, "ctaLabel", "Shop now");
  const ctaHref = str(props, "ctaHref", "/products");
  const imageUrl = str(props, "imageUrl");

  return (
    <section className="container-store pt-8">
      <div className="relative overflow-hidden rounded-2xl bg-surface">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        )}
        {/* Scrim keeps the copy legible over any image the admin uploads. */}
        {imageUrl && <div className="absolute inset-0 bg-black/45" />}

        <div
          className={`relative px-6 py-20 sm:px-12 sm:py-28 ${
            imageUrl ? "text-white" : "text-fg"
          }`}
        >
          <div className="max-w-xl">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              {heading}
            </h1>
            {subheading && (
              <p
                className={`mt-4 text-base sm:text-lg ${
                  imageUrl ? "text-white/85" : "text-muted"
                }`}
              >
                {subheading}
              </p>
            )}
            {ctaLabel && (
              <ButtonLink
                href={ctaHref}
                size="lg"
                variant={imageUrl ? "accent" : "primary"}
                className="mt-8"
              >
                {ctaLabel}
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- featured

async function Featured({ props }: { props: Record<string, unknown> }) {
  const heading = str(props, "heading", "Featured");
  const limit = num(props, "limit", 4);
  const settings = await getSettings();

  // Fall back to newest when nothing is explicitly featured, so the homepage
  // is never empty on a fresh store.
  let products = await prisma.product.findMany({
    where: { status: "ACTIVE", featured: true },
    select: productCardSelect,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: productCardSelect,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  if (products.length === 0) return null;

  return (
    <section className="container-store pt-16">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{heading}</h2>
        <Link href="/products" className="text-sm text-accent hover:underline">
          View all
        </Link>
      </div>
      <ProductGrid products={products} settings={settings} />
    </section>
  );
}

// ---------------------------------------------------------------- categories

async function CategoryGrid({ props }: { props: Record<string, unknown> }) {
  const heading = str(props, "heading", "Shop by category");
  const categories = (await getVisibleCategories()).filter(
    (category) => category._count.products > 0,
  );

  if (categories.length === 0) return null;

  return (
    <section className="container-store pt-16">
      <h2 className="mb-6 text-xl font-semibold tracking-tight sm:text-2xl">{heading}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/c/${category.slug}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-surface"
          >
            {category.imageUrl && (
              <Image
                src={category.imageUrl}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="font-medium">{category.name}</p>
              <p className="text-xs text-white/75">
                {category._count.products} product
                {category._count.products === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- banner

function Banner({ props }: { props: Record<string, unknown> }) {
  const heading = str(props, "heading");
  const body = str(props, "body");
  const ctaLabel = str(props, "ctaLabel");
  const ctaHref = str(props, "ctaHref", "/products");

  if (!heading && !body) return null;

  return (
    <section className="container-store pt-16">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-primary px-6 py-10 text-primary-fg sm:flex-row sm:items-center sm:px-10">
        <div>
          {heading && <p className="text-xl font-semibold sm:text-2xl">{heading}</p>}
          {body && <p className="mt-1 text-sm opacity-80">{body}</p>}
        </div>
        {ctaLabel && (
          <ButtonLink href={ctaHref} variant="accent" size="lg">
            {ctaLabel}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- rich text

function RichText({ props }: { props: Record<string, unknown> }) {
  const heading = str(props, "heading");
  const body = str(props, "body");
  if (!body && !heading) return null;

  return (
    <section className="container-store pt-16">
      <div className="mx-auto max-w-3xl">
        {heading && (
          <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">
            {heading}
          </h2>
        )}
        {body && <Markdown content={body} />}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- registry

const renderers: Record<
  SectionType,
  (args: { props: Record<string, unknown> }) => React.ReactNode
> = {
  hero: Hero,
  featured: Featured,
  categoryGrid: CategoryGrid,
  banner: Banner,
  richText: RichText,
};

export function renderSection(section: HomeSection) {
  const Renderer = renderers[section.type];
  if (!Renderer) return null;
  return <Renderer key={section.id} props={section.props} />;
}

/** Used when a store has no configured sections yet. */
export const defaultSections: HomeSection[] = [
  {
    id: "default-hero",
    type: "hero",
    enabled: true,
    props: {
      heading: "Welcome to the store",
      subheading: "Edit this hero from Admin → Settings → Homepage.",
      ctaLabel: "Shop all products",
      ctaHref: "/products",
    },
  },
  { id: "default-categories", type: "categoryGrid", enabled: true, props: {} },
  { id: "default-featured", type: "featured", enabled: true, props: { limit: 4 } },
];
