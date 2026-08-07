"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Back navigation that also works as a plain link.
 *
 * It renders a real <Link> to `fallbackHref`, so it functions before hydration
 * and with JavaScript off. Once interactive, a click prefers the browser's own
 * history — which is what someone actually means by "back" — and only falls
 * through to the href when there's nothing to go back to (a shared link, a new
 * tab, a bookmark).
 */
export function BackButton({
  fallbackHref = "/",
  label = "Back",
  hideOn = [],
  className,
}: {
  fallbackHref?: string;
  label?: string;
  /** Paths where going "back" is meaningless, e.g. the section's own root. */
  hideOn?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (hideOn.includes(pathname)) return null;

  return (
    <Link
      href={fallbackHref}
      onClick={(event) => {
        // Respect modified clicks (new tab, download, …).
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (window.history.length > 1) {
          event.preventDefault();
          router.back();
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
