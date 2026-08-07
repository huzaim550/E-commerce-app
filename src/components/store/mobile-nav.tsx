"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileNav({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-2 text-fg hover:bg-surface md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <nav className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-bg p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-muted">Browse</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 hover:bg-surface"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <Link
              href="/products"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-surface"
            >
              All products
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/c/${category.slug}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-surface"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
