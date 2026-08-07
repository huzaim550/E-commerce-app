import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  queryProducts,
  parseSort,
  sortLabels,
  getCategoryFacets,
} from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { Pagination } from "@/components/store/pagination";
import { Facets, readFacetParams } from "@/components/store/facets";
import { EmptyState } from "@/components/ui";

async function getCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, active: true },
    select: { id: true, name: true, slug: true, description: true },
  });
}

export async function generateMetadata(
  props: PageProps<"/c/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategory(slug);
  if (!category) return {};

  return {
    title: category.name,
    description: category.description ?? undefined,
  };
}

export default async function CategoryPage(props: PageProps<"/c/[slug]">) {
  const { slug } = await props.params;
  const params = await props.searchParams;

  const category = await getCategory(slug);
  if (!category) notFound();

  const sort = parseSort(typeof params.sort === "string" ? params.sort : undefined);
  const page = Number(params.page) || 1;

  const facets = await getCategoryFacets(slug);
  const selected = readFacetParams(params, facets);

  const [settings, result] = await Promise.all([
    getSettings(),
    queryProducts({ categorySlug: slug, sort, page, attributes: selected }),
  ]);

  const basePath = `/c/${slug}`;

  return (
    <div className="container-store py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-sm text-muted">{category.description}</p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className={facets.length ? "" : "hidden"}>
          <Facets
            facets={facets}
            selected={selected}
            basePath={basePath}
            params={params}
          />
        </div>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted">
              {result.total} product{result.total === 1 ? "" : "s"}
            </p>

            <form>
              {Object.entries(selected).flatMap(([key, values]) =>
                values.map((value) => (
                  <input
                    key={`${key}-${value}`}
                    type="hidden"
                    name={`attr_${key}`}
                    value={value}
                  />
                )),
              )}
              <select
                name="sort"
                defaultValue={sort}
                className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label as string}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="ml-2 rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-surface"
              >
                Sort
              </button>
            </form>
          </div>

          {result.items.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              description="Try removing a filter to see more products."
            />
          ) : (
            <>
              <ProductGrid products={result.items} settings={settings} />
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                basePath={basePath}
                params={params}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
