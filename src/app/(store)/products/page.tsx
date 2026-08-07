import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { getSettings } from "@/lib/settings";
import {
  queryProducts,
  parseSort,
  sortLabels,
  getVisibleCategories,
  type ProductSort,
} from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { Pagination } from "@/components/store/pagination";
import { EmptyState, ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "All products",
};

export default async function ProductsPage(props: PageProps<"/products">) {
  const params = await props.searchParams;

  const search = typeof params.q === "string" ? params.q : undefined;
  const sort = parseSort(typeof params.sort === "string" ? params.sort : undefined);
  const page = Number(params.page) || 1;

  const [settings, result, categories] = await Promise.all([
    getSettings(),
    queryProducts({ search, sort, page }),
    getVisibleCategories(),
  ]);

  return (
    <div className="container-store py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {search ? `Results for “${search}”` : "All products"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {result.total} product{result.total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/products"
          className="rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-fg"
        >
          All
        </Link>
        {categories
          .filter((c) => c._count.products > 0)
          .map((category) => (
            <Link
              key={category.id}
              href={`/c/${category.slug}`}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-fg"
            >
              {category.name}
            </Link>
          ))}

        <form className="ml-auto">
          {search && <input type="hidden" name="q" value={search} />}
          <select
            name="sort"
            defaultValue={sort}
            // Progressive enhancement: the button below works without JS.
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
          icon={<SearchX className="size-8" />}
          title={search ? "No products matched that search" : "No products yet"}
          description={
            search
              ? "Try a different term, or browse the full catalogue."
              : "Add your first product from the admin panel."
          }
          action={<ButtonLink href="/products">Browse all products</ButtonLink>}
        />
      ) : (
        <>
          <ProductGrid products={result.items} settings={settings} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath="/products"
            params={{ q: search, sort: sort as ProductSort }}
          />
        </>
      )}
    </div>
  );
}
