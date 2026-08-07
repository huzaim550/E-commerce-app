"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { updateCartItem, removeCartItem } from "@/app/actions/cart";
import { formatMoney, type MoneyConfig } from "@/lib/money";
import { describeOptions } from "@/lib/types";
import { Alert } from "@/components/ui";
import type { CartLine } from "@/lib/cart";

export function CartView({
  lines,
  money,
}: {
  lines: CartLine[];
  money: MoneyConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function mutate(itemId: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusyId(itemId);
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      setNotice(result.ok ? (result.message ?? null) : (result.error ?? null));
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {notice && <Alert tone="info">{notice}</Alert>}

      <ul className="divide-y divide-line rounded-xl border border-line">
        {lines.map((line) => {
          const busy = pending && busyId === line.id;
          const optionText = describeOptions(line.options);

          return (
            <li key={line.id} className="flex gap-4 p-4">
              <Link
                href={`/products/${line.slug}`}
                className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface"
              >
                {line.image ? (
                  <Image
                    src={line.image}
                    alt={line.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-muted">
                    <ImageOff className="size-5" aria-hidden />
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${line.slug}`}
                  className="text-sm font-medium hover:text-accent"
                >
                  {line.title}
                </Link>
                {optionText && <p className="mt-0.5 text-xs text-muted">{optionText}</p>}
                <p className="mt-1 text-sm text-muted">
                  {formatMoney(line.unitPriceCents, money)} each
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => mutate(line.id, () => updateCartItem(line.id, line.qty - 1))}
                      disabled={busy}
                      className="p-2 disabled:opacity-40"
                      aria-label={`Decrease quantity of ${line.title}`}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm">
                      {busy ? <Loader2 className="mx-auto size-3.5 animate-spin" /> : line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => mutate(line.id, () => updateCartItem(line.id, line.qty + 1))}
                      disabled={busy || line.qty >= line.stock}
                      className="p-2 disabled:opacity-40"
                      aria-label={`Increase quantity of ${line.title}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => mutate(line.id, () => removeCartItem(line.id))}
                    disabled={busy}
                    className="flex items-center gap-1 text-xs text-muted hover:text-red-600 disabled:opacity-40"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </button>

                  {line.qty >= line.stock && (
                    <span className="text-xs text-amber-600">Max stock reached</span>
                  )}
                </div>
              </div>

              <div className="text-sm font-semibold">
                {formatMoney(line.lineTotalCents, money)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
