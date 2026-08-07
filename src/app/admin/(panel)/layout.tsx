import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Ticket,
  Truck,
  FileText,
  Settings,
  Images,
  Store,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui";
import { AdminNavLink } from "@/components/admin/nav-link";
import { BackButton } from "@/components/back-button";

export const metadata = {
  robots: { index: false, follow: false },
};

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/shipping", label: "Shipping", icon: Truck },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Authoritative guard. `proxy.ts` only does an optimistic cookie check.
  const user = await requireStaff();
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface lg:w-60 lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center px-5">
          <Link href="/admin" className="truncate font-semibold">
            {settings.storeName}
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map((item) => (
            <AdminNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              exact={"exact" in item ? item.exact : false}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
            </AdminNavLink>
          ))}
        </nav>

        <div className="hidden border-t border-line p-3 lg:block">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg hover:text-fg"
          >
            <Store className="size-4" aria-hidden />
            View store
          </Link>
          <div className="mt-2 px-3 py-2">
            <p className="truncate text-xs text-muted">{user.email}</p>
            <form action={logout} className="mt-2">
              <Button type="submit" variant="outline" size="sm" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-bg">
        <div className="mx-auto max-w-6xl p-5 lg:p-8">
          {/* Hidden on the dashboard, which is the panel's own root. */}
          <div className="mb-4 empty:hidden">
            <BackButton fallbackHref="/admin" hideOn={["/admin"]} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
