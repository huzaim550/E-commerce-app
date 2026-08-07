import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Slug that is unique against `exists`, by appending -2, -3, ... */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
) {
  const root = slugify(base) || "item";
  let candidate = root;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/** Strips markdown to plain text, for meta descriptions and card excerpts. */
export function plainText(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
