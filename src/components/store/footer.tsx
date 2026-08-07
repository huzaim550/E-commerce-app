import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getVisibleCategories } from "@/lib/catalog";
import { parseSocials } from "@/lib/types";

const socialLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
};

export async function Footer() {
  const [settings, categories, pages] = await Promise.all([
    getSettings(),
    getVisibleCategories(),
    prisma.page.findMany({
      where: { published: true, showInFooter: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true },
    }),
  ]);

  const socials = Object.entries(parseSocials(settings.socials)).filter(
    ([, url]) => Boolean(url),
  );

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container-store py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-semibold">{settings.storeName}</p>
            {settings.tagline && (
              <p className="mt-2 text-sm text-muted">{settings.tagline}</p>
            )}
            {socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {socials.map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
                  >
                    {socialLabels[key] ?? key}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold">Shop</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/products" className="text-sm text-muted hover:text-fg">
                  All products
                </Link>
              </li>
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/c/${category.slug}`}
                    className="text-sm text-muted hover:text-fg"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Information</p>
            <ul className="mt-3 space-y-2">
              {pages.map((page) => (
                <li key={page.slug}>
                  <Link href={`/p/${page.slug}`} className="text-sm text-muted hover:text-fg">
                    {page.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/order-lookup" className="text-sm text-muted hover:text-fg">
                  Track an order
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {settings.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-fg">
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings.contactPhone && (
                <li>
                  <a href={`tel:${settings.contactPhone}`} className="hover:text-fg">
                    {settings.contactPhone}
                  </a>
                </li>
              )}
              {settings.contactAddress && <li>{settings.contactAddress}</li>}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-sm text-muted">
          © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
