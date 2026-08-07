"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { addToCartAction } from "@/app/actions/cart";
import type { ActionResult } from "@/lib/validation";
import { formatMoney, discountPercent, type MoneyConfig } from "@/lib/money";
import { Button, Badge, Alert } from "@/components/ui";
import { cn } from "@/lib/utils";

export type ClientVariant = {
  id: string;
  name: string;
  options: Record<string, string>;
  priceCents: number;
  stock: number;
  sku: string | null;
  imageUrl: string | null;
};

export type ClientOptionGroup = {
  name: string;
  values: string[];
};

/**
 * Interactive part of the product page. Selecting options resolves to exactly
 * one variant; add-to-cart is disabled until a real, in-stock variant matches,
 * so an impossible combination can never be submitted.
 */
export function ProductDetail({
  images,
  title,
  basePriceCents,
  comparePriceCents,
  optionGroups,
  variants,
  money,
}: {
  images: string[];
  title: string;
  basePriceCents: number;
  comparePriceCents: number | null;
  optionGroups: ClientOptionGroup[];
  variants: ClientVariant[];
  money: MoneyConfig;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<{ count: number }> | null,
    FormData
  >(addToCartAction, null);
  const [qty, setQty] = useState(1);
  // The selection an "Added to cart" message belongs to; recorded on submit.
  const [submittedSelection, setSubmittedSelection] = useState("");

  // Keep the header cart badge in step with the server after a successful add.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  // Pre-select the first in-stock variant so the page opens ready to buy.
  const initial = useMemo(() => {
    const preferred = variants.find((v) => v.stock > 0) ?? variants[0];
    return preferred?.options ?? {};
  }, [variants]);

  const [selection, setSelection] = useState<Record<string, string>>(initial);
  const [activeImage, setActiveImage] = useState(0);

  const selectedVariant = useMemo(() => {
    if (optionGroups.length === 0) return variants[0] ?? null;
    return (
      variants.find((variant) =>
        optionGroups.every((group) => variant.options[group.name] === selection[group.name]),
      ) ?? null
    );
  }, [optionGroups, selection, variants]);

  /** A value is offerable if some in-stock variant has it alongside the rest of the selection. */
  const isAvailable = (groupName: string, value: string) =>
    variants.some(
      (variant) =>
        variant.stock > 0 &&
        variant.options[groupName] === value &&
        optionGroups
          .filter((g) => g.name !== groupName)
          .every((g) => !selection[g.name] || variant.options[g.name] === selection[g.name]),
    );

  const priceCents = selectedVariant?.priceCents ?? basePriceCents;
  const off = discountPercent(priceCents, comparePriceCents);
  const stock = selectedVariant?.stock ?? 0;
  const canBuy = Boolean(selectedVariant) && stock > 0;
  const maxQty = Math.max(1, Math.min(stock, 99));

  const gallery = selectedVariant?.imageUrl
    ? [selectedVariant.imageUrl, ...images.filter((i) => i !== selectedVariant.imageUrl)]
    : images;
  const shownImage = gallery[Math.min(activeImage, gallery.length - 1)];

  // "Added to cart" refers to whatever was selected when it was submitted, so
  // it hides again once the shopper picks a different option. Compared during
  // render rather than cleared in an effect.
  const selectionKey = JSON.stringify(selection);
  const showResult = state !== null && submittedSelection === selectionKey;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* gallery */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface">
          {shownImage ? (
            <Image
              src={shownImage}
              alt={title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              <ImageOff className="size-10" aria-hidden />
            </div>
          )}
        </div>

        {gallery.length > 1 && (
          <div className="mt-3 grid grid-cols-5 gap-2">
            {gallery.slice(0, 5).map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveImage(index)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg border-2 bg-surface",
                  index === activeImage ? "border-accent" : "border-transparent",
                )}
                aria-label={`View image ${index + 1}`}
              >
                <Image src={image} alt="" fill sizes="20vw" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* buy box */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-2xl font-semibold">{formatMoney(priceCents, money)}</span>
          {comparePriceCents && comparePriceCents > priceCents && (
            <>
              <span className="text-base text-muted line-through">
                {formatMoney(comparePriceCents, money)}
              </span>
              {off !== null && <Badge tone="danger">Save {off}%</Badge>}
            </>
          )}
        </div>

        {optionGroups.map((group) => (
          <div key={group.name} className="mt-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium">{group.name}</span>
              {selection[group.name] && (
                <span className="text-sm text-muted">{selection[group.name]}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const active = selection[group.name] === value;
                const available = isAvailable(group.name, value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelection((prev) => ({ ...prev, [group.name]: value }));
                      setQty(1);
                    }}
                    className={cn(
                      "rounded-lg border px-3.5 py-2 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-fg"
                        : "border-line hover:border-fg",
                      !available && !active && "text-muted line-through opacity-60",
                    )}
                    // Still selectable when sold out, so the customer can see it exists.
                    aria-pressed={active}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6 text-sm">
          {!selectedVariant ? (
            <span className="text-muted">That combination isn&apos;t available.</span>
          ) : stock === 0 ? (
            <Badge tone="danger">Out of stock</Badge>
          ) : stock <= 5 ? (
            <Badge tone="warning">Only {stock} left</Badge>
          ) : (
            <Badge tone="success">In stock</Badge>
          )}
        </div>

        {/*
          A real form, not an onClick handler: React replays a submit that
          happens before hydration finishes, and with JS off the browser posts
          it natively. Either way the button works as soon as it's on screen.
        */}
        <form
          action={formAction}
          onSubmit={() => setSubmittedSelection(selectionKey)}
          className="mt-6 flex items-center gap-3"
        >
          <input type="hidden" name="variantId" value={selectedVariant?.id ?? ""} />
          <input type="hidden" name="qty" value={qty} />

          <div className="flex items-center rounded-lg border border-line">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1 || !canBuy}
              className="p-2.5 text-fg disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty || !canBuy}
              className="p-2.5 text-fg disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <Button type="submit" disabled={!canBuy || pending} size="lg" className="flex-1">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingBag className="size-4" />
            )}
            {stock === 0 ? "Out of stock" : "Add to cart"}
          </Button>
        </form>

        {showResult && state && (
          <div className="mt-4">
            <Alert tone={state.ok ? "success" : "error"}>
              {state.ok ? (state.message ?? "Added to cart.") : state.error}
            </Alert>
          </div>
        )}

        {selectedVariant?.sku && (
          <p className="mt-4 text-xs text-muted">SKU: {selectedVariant.sku}</p>
        )}
      </div>
    </div>
  );
}
