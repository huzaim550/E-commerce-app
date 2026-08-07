import Link from "next/link";
import Image from "next/image";
import { ImageOff, Package, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { parseImages } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, ButtonLink, EmptyState, Input } from "@/components/ui";
import { RowActions } from "@/components/admin/row-actions";

const statusTones = {
  DRAFT: "neutral",
  ACTIVE: "success",
  ARCHIVED: "warning",
} as const;

const PER_PAGE = 20;

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const params = await props.searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [settings, products, total] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        images: true,
        basePriceCents: true,
        category: { select: { name: true } },
        variants: { where: { active: true }, select: { stock: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={
          <ButtonLink href="/admin/products/new">
            <Plus className="size-4" />
            New product
          </ButtonLink>
        }
      />

      <form className="mb-4">
        <Input
          name="q"
          defaultValue={search}
          placeholder="Search products…"
          className="max-w-sm"
        />
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" />}
          title={search ? "No products matched" : "No products yet"}
          description={
            search ? "Try a different search." : "Create your first product to get started."
          }
          action={
            <ButtonLink href="/admin/products/new">
              <Plus className="size-4" />
              New product
            </ButtonLink>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted">
                <tr>
                  <th className="p-3 font-medium">Product</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Category</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Stock</th>
                  <th className="p-3 font-medium">Price</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => {
                  const image = parseImages(product.images)[0];
                  const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);

                  return (
                    <tr key={product.id} className="hover:bg-surface">
                      <td className="p-3">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                            {image ? (
                              <Image
                                src={image}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center text-muted">
                                <ImageOff className="size-4" aria-hidden />
                              </span>
                            )}
                          </div>
                          <span className="font-medium">{product.title}</span>
                        </Link>
                      </td>
                      <td className="hidden p-3 text-muted sm:table-cell">
                        {product.category?.name ?? "—"}
                      </td>
                      <td className="p-3">
                        <Badge tone={statusTones[product.status]}>{product.status}</Badge>
                      </td>
                      <td className="hidden p-3 sm:table-cell">
                        <span className={stock === 0 ? "text-red-600" : ""}>{stock}</span>
                      </td>
                      <td className="p-3 font-medium">
                        {formatMoney(product.basePriceCents, settings)}
                      </td>
                      <td className="p-3 text-right">
                        <RowActions
                          id={product.id}
                          editHref={`/admin/products/${product.id}`}
                          viewHref={
                            product.status === "ACTIVE" ? `/products/${product.slug}` : undefined
                          }
                          kind="product"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`/admin/products?${new URLSearchParams({
                    ...(search ? { q: search } : {}),
                    page: String(n),
                  })}`}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    n === page
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-line hover:bg-surface"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
