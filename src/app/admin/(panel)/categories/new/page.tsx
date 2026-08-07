import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/category-form";
import { emptyCategory } from "@/lib/admin-forms";

export default async function NewCategoryPage() {
  const parents = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="New category"
        description="Add custom fields to describe what makes these products different."
      />
      <CategoryForm category={emptyCategory} parents={parents} />
    </>
  );
}
