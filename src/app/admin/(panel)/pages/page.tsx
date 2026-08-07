import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { RowActions } from "@/components/admin/row-actions";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Markdown content pages like About, Shipping and Returns."
        actions={
          <ButtonLink href="/admin/pages/new">
            <Plus className="size-4" />
            New page
          </ButtonLink>
        }
      />

      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-8" />}
          title="No pages yet"
          description="Add an About or Returns page — they'll appear in the footer."
          action={
            <ButtonLink href="/admin/pages/new">
              <Plus className="size-4" />
              New page
            </ButtonLink>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr>
                <th className="p-3 font-medium">Title</th>
                <th className="hidden p-3 font-medium sm:table-cell">URL</th>
                <th className="p-3 font-medium">Status</th>
                <th className="hidden p-3 font-medium sm:table-cell">In footer</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-surface">
                  <td className="p-3">
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td className="hidden p-3 font-mono text-xs text-muted sm:table-cell">
                    /p/{page.slug}
                  </td>
                  <td className="p-3">
                    <Badge tone={page.published ? "success" : "neutral"}>
                      {page.published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="hidden p-3 text-muted sm:table-cell">
                    {page.showInFooter ? "Yes" : "No"}
                  </td>
                  <td className="p-3 text-right">
                    <RowActions
                      id={page.id}
                      editHref={`/admin/pages/${page.id}`}
                      viewHref={page.published ? `/p/${page.slug}` : undefined}
                      kind="page"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
