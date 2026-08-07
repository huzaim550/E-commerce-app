import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { parseAttributeSchema } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { emptyProduct } from "@/lib/admin-forms";

export default async function NewProductPage() {
  const [settings, categories] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, attributeSchema: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="New product"
        description="Pick a category first — it decides which custom fields this product gets."
      />
      <ProductForm
        product={emptyProduct}
        currencySymbol={settings.currencySymbol}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          attributeSchema: parseAttributeSchema(c.attributeSchema),
        }))}
      />
    </>
  );
}
