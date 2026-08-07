import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { PageForm } from "@/components/admin/simple-forms";
import { ButtonLink } from "@/components/ui";

export default async function EditContentPage(props: PageProps<"/admin/pages/[id]">) {
  const { id } = await props.params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <>
      <PageHeader
        title={page.title}
        description={`/p/${page.slug}`}
        actions={
          page.published && (
            <ButtonLink href={`/p/${page.slug}`} target="_blank" variant="outline" size="sm">
              View
            </ButtonLink>
          )
        }
      />
      <PageForm
        page={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          body: page.body,
          published: page.published,
          showInFooter: page.showInFooter,
          sortOrder: page.sortOrder,
          seoDescription: page.seoDescription ?? "",
        }}
      />
    </>
  );
}
