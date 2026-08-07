"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminNavLink({
  href,
  label,
  exact = false,
  children,
}: {
  href: string;
  label: string;
  exact?: boolean;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-fg" : "text-muted hover:bg-bg hover:text-fg",
      )}
    >
      {children}
      {label}
    </Link>
  );
}
