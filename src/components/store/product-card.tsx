import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cardPricing, primaryImage, type ProductCardData } from "@/lib/catalog";
import { formatMoney, discountPercent } from "@/lib/money";
import type { StoreSettings } from "@/lib/settings";
import { Badge } from "@/components/ui";

export function ProductCard({
  product,
  settings,
  priority = false,
}: {
  product: ProductCardData;
  settings: StoreSettings;
  priority?: boolean;
}) {
  const { priceCents, inStock, hasRange } = cardPricing(product);
  const image = primaryImage(product.images);
  const off = discountPercent(priceCents, product.comparePriceCents);

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}

        {off !== null && (
          <Badge tone="danger" className="absolute top-2 left-2">
            −{off}%
          </Badge>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
            <Badge tone="neutral">Sold out</Badge>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {product.category && (
          <p className="text-xs text-muted">{product.category.name}</p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-fg group-hover:text-accent">
          {product.title}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-sm font-semibold">
            {hasRange && <span className="text-muted">From </span>}
            {formatMoney(priceCents, settings)}
          </span>
          {product.comparePriceCents && product.comparePriceCents > priceCents && (
            <span className="text-xs text-muted line-through">
              {formatMoney(product.comparePriceCents, settings)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({
  products,
  settings,
}: {
  products: ProductCardData[];
  settings: StoreSettings;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          settings={settings}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
