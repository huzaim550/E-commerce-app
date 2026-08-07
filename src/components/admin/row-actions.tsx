"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteProduct, duplicateProduct } from "@/app/actions/admin/products";
import { deleteCategory } from "@/app/actions/admin/categories";
import {
  deleteCoupon,
  deletePage,
  deleteShippingRate,
  deleteMediaAsset,
} from "@/app/actions/admin/catalog-extras";
import type { ActionResult } from "@/lib/validation";

type Kind = "product" | "category" | "coupon" | "shipping" | "page" | "media";

const deleters: Record<Kind, (id: string) => Promise<ActionResult>> = {
  product: deleteProduct,
  category: deleteCategory,
  coupon: deleteCoupon,
  shipping: deleteShippingRate,
  page: deletePage,
  media: deleteMediaAsset,
};

/**
 * Edit / view / duplicate / delete for a table row. Deletion asks for
 * confirmation because it isn't undoable.
 */
export function RowActions({
  id,
  editHref,
  viewHref,
  kind,
  canDuplicate = false,
}: {
  id: string;
  editHref?: string;
  viewHref?: string;
  kind: Kind;
  canDuplicate?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      // Reset if the admin walks away instead of confirming.
      setTimeout(() => setConfirming(false), 4000);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleters[kind](id);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    });
  }

  const iconClass = "rounded-md p-1.5 text-muted hover:bg-line/60 hover:text-fg";

  return (
    <div className="flex items-center justify-end gap-0.5">
      {error && <span className="mr-2 text-xs text-red-600">{error}</span>}

      {viewHref && (
        <Link href={viewHref} target="_blank" className={iconClass} title="View in store">
          <ExternalLink className="size-4" />
        </Link>
      )}

      {editHref && (
        <Link href={editHref} className={iconClass} title="Edit">
          <Pencil className="size-4" />
        </Link>
      )}

      {canDuplicate && (
        <button
          type="button"
          onClick={() => startTransition(() => duplicateProduct(id).then(() => {}))}
          disabled={pending}
          className={iconClass}
          title="Duplicate"
        >
          <Copy className="size-4" />
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={
          confirming
            ? "rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white"
            : `${iconClass} hover:text-red-600`
        }
        title="Delete"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : confirming ? (
          "Confirm?"
        ) : (
          <Trash2 className="size-4" />
        )}
      </button>
    </div>
  );
}
