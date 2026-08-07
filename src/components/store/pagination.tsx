import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item) search.append(key, item);
      }
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Window of pages around the current one, so 200 pages don't render 200 links.
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const linkClass = "rounded-md border border-line px-3 py-2 text-sm hover:bg-surface";

  return (
    <nav className="mt-10 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className={linkClass} rel="prev">
          Previous
        </Link>
      )}

      {pages.map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-current={n === page ? "page" : undefined}
          className={cn(
            linkClass,
            n === page && "border-primary bg-primary text-primary-fg hover:bg-primary",
          )}
        >
          {n}
        </Link>
      ))}

      {page < pageCount && (
        <Link href={href(page + 1)} className={linkClass} rel="next">
          Next
        </Link>
      )}
    </nav>
  );
}
