import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseAttributeSchema } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage(
  props: PageProps<"/admin/categories/[id]">,
) {
  const { id } = await props.params;

  const [category, parents] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!category) notFound();

  return (
    <>
      <PageHeader
        title={category.name}
        description={`${category._count.products} product${
          category._count.products === 1 ? "" : "s"
        } · /c/${category.slug}`}
      />

      <CategoryForm
        parents={parents}
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          imageUrl: category.imageUrl ?? "",
          parentId: category.parentId ?? "",
          sortOrder: category.sortOrder,
          active: category.active,
          attributeSchema: parseAttributeSchema(category.attributeSchema),
        }}
      />
    </>
  );
}
