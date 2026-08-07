import Link from "next/link";
import { FolderTree, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { parseAttributeSchema } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { RowActions } from "@/components/admin/row-actions";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Categories"
        description="Each category defines the custom fields its products get."
        actions={
          <ButtonLink href="/admin/categories/new">
            <Plus className="size-4" />
            New category
          </ButtonLink>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="size-8" />}
          title="No categories yet"
          description="Categories group your products and define their custom fields."
          action={
            <ButtonLink href="/admin/categories/new">
              <Plus className="size-4" />
              New category
            </ButtonLink>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="hidden p-3 font-medium sm:table-cell">Custom fields</th>
                <th className="p-3 font-medium">Products</th>
                <th className="p-3 font-medium">Visible</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((category) => {
                const fields = parseAttributeSchema(category.attributeSchema);

                return (
                  <tr key={category.id} className="hover:bg-surface">
                    <td className="p-3">
                      <Link
                        href={`/admin/categories/${category.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {category.name}
                      </Link>
                      {category.parent && (
                        <span className="ml-2 text-xs text-muted">
                          in {category.parent.name}
                        </span>
                      )}
                    </td>
                    <td className="hidden p-3 sm:table-cell">
                      {fields.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {fields.slice(0, 4).map((field) => (
                            <Badge key={field.key}>{field.label}</Badge>
                          ))}
                          {fields.length > 4 && (
                            <span className="text-xs text-muted">
                              +{fields.length - 4}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-3">{category._count.products}</td>
                    <td className="p-3">
                      <Badge tone={category.active ? "success" : "neutral"}>
                        {category.active ? "Yes" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <RowActions
                        id={category.id}
                        editHref={`/admin/categories/${category.id}`}
                        viewHref={category.active ? `/c/${category.slug}` : undefined}
                        kind="category"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
