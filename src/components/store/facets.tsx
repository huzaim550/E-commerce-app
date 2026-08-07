import Link from "next/link";
import { Check } from "lucide-react";
import type { AttributeField } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Facet = {
  field: AttributeField;
  values: { value: string; count: number }[];
};

type SearchParams = Record<string, string | string[] | undefined>;

export function readFacetParams(params: SearchParams, facets: Facet[]) {
  const selected: Record<string, string[]> = {};
  for (const { field } of facets) {
    const raw = params[`attr_${field.key}`];
    if (!raw) continue;
    selected[field.key] = Array.isArray(raw) ? raw : [raw];
  }
  return selected;
}

/**
 * Facets are plain links that toggle a query param, so filtering works with
 * JavaScript disabled and every filtered view is a shareable URL.
 */
export function Facets({
  facets,
  selected,
  basePath,
  params,
}: {
  facets: Facet[];
  selected: Record<string, string[]>;
  basePath: string;
  params: SearchParams;
}) {
  if (facets.length === 0) return null;

  const toggleHref = (key: string, value: string) => {
    const search = new URLSearchParams();

    for (const [paramKey, paramValue] of Object.entries(params)) {
      if (paramKey === "page" || paramKey === `attr_${key}` || paramValue === undefined) {
        continue;
      }
      for (const item of Array.isArray(paramValue) ? paramValue : [paramValue]) {
        if (item) search.append(paramKey, item);
      }
    }

    const current = selected[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    for (const item of next) search.append(`attr_${key}`, item);

    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const hasAny = Object.values(selected).some((values) => values.length > 0);

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {hasAny && (
          <Link href={basePath} className="text-xs text-accent hover:underline">
            Clear all
          </Link>
        )}
      </div>

      {facets.map(({ field, values }) => (
        <div key={field.key}>
          <p className="mb-2 text-sm font-medium">{field.label}</p>
          <ul className="space-y-1">
            {values.map(({ value, count }) => {
              const active = (selected[field.key] ?? []).includes(value);
              return (
                <li key={value}>
                  <Link
                    href={toggleHref(field.key, value)}
                    scroll={false}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface",
                      active ? "text-fg" : "text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        active ? "border-accent bg-accent text-accent-fg" : "border-line",
                      )}
                      aria-hidden
                    >
                      {active && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="flex-1">
                      {value}
                      {field.unit ? ` ${field.unit}` : ""}
                    </span>
                    <span className="text-xs text-muted">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
