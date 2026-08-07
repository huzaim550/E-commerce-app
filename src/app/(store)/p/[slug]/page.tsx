import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Markdown } from "@/components/store/markdown";

async function getPage(slug: string) {
  return prisma.page.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata(
  props: PageProps<"/p/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getPage(slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.seoDescription ?? undefined,
  };
}

export default async function ContentPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;

  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <div className="container-store py-12">
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">{page.title}</h1>
        <Markdown content={page.body} />
      </article>
    </div>
  );
}
