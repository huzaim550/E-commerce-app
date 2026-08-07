import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  parseAttributeSchema,
  parseAttributeValues,
  parseImages,
  parseOptions,
} from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { toProductFormData } from "@/lib/admin-forms";
import { ButtonLink } from "@/components/ui";

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]">,
) {
  const { id } = await props.params;

  const [settings, product, categories] = await Promise.all([
    getSettings(),
    prisma.product.findUnique({
      where: { id },
      include: {
        optionGroups: { orderBy: { sortOrder: "asc" } },
        variants: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, attributeSchema: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.title}
        description={`/products/${product.slug}`}
        actions={
          product.status === "ACTIVE" && (
            <ButtonLink
              href={`/products/${product.slug}`}
              target="_blank"
              variant="outline"
              size="sm"
            >
              View in store
            </ButtonLink>
          )
        }
      />

      <ProductForm
        currencySymbol={settings.currencySymbol}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          attributeSchema: parseAttributeSchema(c.attributeSchema),
        }))}
        product={toProductFormData({
          ...product,
          images: parseImages(product.images),
          attributes: parseAttributeValues(product.attributes),
          optionGroups: product.optionGroups.map((g) => ({
            name: g.name,
            values: g.values,
          })),
          variants: product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            options: parseOptions(v.options),
            priceCents: v.priceCents,
            sku: v.sku,
            stock: v.stock,
          })),
        })}
      />
    </>
  );
}
