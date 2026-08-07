import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingBag, User } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getVisibleCategories } from "@/lib/catalog";
import { getCartCount } from "@/lib/cart";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";

export async function Header() {
  const [settings, categories, cartCount, user] = await Promise.all([
    getSettings(),
    getVisibleCategories(),
    getCartCount(),
    getCurrentUser(),
  ]);

  const navCategories = categories.filter((c) => c._count.products > 0).slice(0, 6);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="container-store">
        <div className="flex h-16 items-center gap-4">
          <MobileNav
            categories={navCategories.map((c) => ({ name: c.name, slug: c.slug }))}
          />

          <Link href="/" className="flex shrink-0 items-center gap-2">
            {settings.logoUrl ? (
              <Image
                src={settings.logoUrl}
                alt={settings.storeName}
                width={140}
                height={36}
                className="h-8 w-auto object-contain"
                priority
              />
            ) : (
              <span className="text-lg font-semibold tracking-tight">
                {settings.storeName}
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/products"
              className="rounded-md px-3 py-2 text-sm font-medium text-fg hover:bg-surface"
            >
              All
            </Link>
            {navCategories.map((category) => (
              <Link
                key={category.id}
                href={`/c/${category.slug}`}
                className="rounded-md px-3 py-2 text-sm font-medium text-fg hover:bg-surface"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          <form action="/products" className="ml-auto hidden max-w-xs flex-1 lg:block">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                placeholder="Search products…"
                aria-label="Search products"
                className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus:bg-bg focus:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            {user && isStaff(user.role) && (
              <Link
                href="/admin"
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-fg sm:block"
              >
                Admin
              </Link>
            )}

            <Link
              href={user ? "/account/orders" : "/login"}
              className="rounded-md p-2 text-fg hover:bg-surface"
              aria-label={user ? "Your account" : "Sign in"}
            >
              <User className="size-5" />
            </Link>

            <Link
              href="/cart"
              className="relative rounded-md p-2 text-fg hover:bg-surface"
              aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-fg">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search collapses below the bar on small screens. */}
        <form action="/products" className="pb-3 lg:hidden">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus:bg-bg focus:outline-none"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
