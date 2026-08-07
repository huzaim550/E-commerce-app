import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import {
  parseImages,
  parseOptions,
  parseAttributeSchema,
  parseAttributeValues,
  formatAttributeValue,
} from "@/lib/types";
import { plainText, truncate } from "@/lib/utils";
import { ProductDetail } from "@/components/store/product-detail";
import { ProductGrid } from "@/components/store/product-card";
import { Markdown } from "@/components/store/markdown";

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const description =
    product.seoDescription || truncate(plainText(product.description), 155);
  const image = parseImages(product.images)[0];

  return {
    title: product.seoTitle || product.title,
    description,
    openGraph: {
      title: product.seoTitle || product.title,
      description,
      images: image ? [image] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([
    getSettings(),
    getRelatedProducts(product.id, product.categoryId),
  ]);

  // Spec table: only fields the category declares, only ones with a value.
  const schema = parseAttributeSchema(product.category?.attributeSchema);
  const values = parseAttributeValues(product.attributes);
  const specs = schema
    .map((field) => ({ field, text: formatAttributeValue(field, values[field.key]) }))
    .filter((row): row is { field: (typeof schema)[number]; text: string } =>
      Boolean(row.text),
    );

  return (
    <div className="container-store py-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted">
        <Link href="/products" className="hover:text-fg">
          Products
        </Link>
        {product.category && (
          <>
            <span aria-hidden>/</span>
            <Link href={`/c/${product.category.slug}`} className="hover:text-fg">
              {product.category.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="truncate text-fg">{product.title}</span>
      </nav>

      <ProductDetail
        title={product.title}
        images={parseImages(product.images)}
        basePriceCents={product.basePriceCents}
        comparePriceCents={product.comparePriceCents}
        money={settings}
        optionGroups={product.optionGroups.map((group) => ({
          name: group.name,
          values: group.values,
        }))}
        variants={product.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          options: parseOptions(variant.options),
          priceCents: variant.priceCents ?? product.basePriceCents,
          stock: variant.stock,
          sku: variant.sku,
          imageUrl: variant.imageUrl,
        }))}
      />

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        {product.description && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Description</h2>
            <Markdown content={product.description} />
          </section>
        )}

        {specs.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Specifications</h2>
            <dl className="overflow-hidden rounded-xl border border-line">
              {specs.map(({ field, text }, index) => (
                <div
                  key={field.key}
                  className={`flex gap-4 px-4 py-3 text-sm ${
                    index % 2 ? "bg-bg" : "bg-surface"
                  }`}
                >
                  <dt className="w-40 shrink-0 text-muted">{field.label}</dt>
                  <dd className="font-medium">{text}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold tracking-tight">You may also like</h2>
          <ProductGrid products={related} settings={settings} />
        </section>
      )}
    </div>
  );
}
