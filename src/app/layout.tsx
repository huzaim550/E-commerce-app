import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const fontStacks: Record<string, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

/** Picks black or white text for a background, by perceived luminance. */
function readableOn(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return "#ffffff";
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL;

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: {
      default: settings.seoTitle || settings.storeName,
      template: `%s · ${settings.storeName}`,
    },
    description: settings.seoDescription || settings.tagline || undefined,
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: settings.storeName,
      title: settings.seoTitle || settings.storeName,
      description: settings.seoDescription || settings.tagline || undefined,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();

  // The admin's palette becomes CSS custom properties; globals.css maps
  // Tailwind's colour utilities onto them.
  const themeVars = {
    "--store-primary": settings.primaryColor,
    "--store-primary-fg": readableOn(settings.primaryColor),
    "--store-accent": settings.accentColor,
    "--store-accent-fg": readableOn(settings.accentColor),
    "--store-font": fontStacks[settings.fontFamily] ?? fontStacks.sans,
  } as React.CSSProperties;

  return (
    <html lang="en" className="h-full" style={themeVars}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
