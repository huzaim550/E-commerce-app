import Image from "next/image";
import { ImageOff } from "lucide-react";
import { formatMoney, type MoneyConfig } from "@/lib/money";
import { describeOptions, formatAddress, parseOptions } from "@/lib/types";
import { Badge } from "@/components/ui";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

export const statusTones = {
  PENDING: "warning",
  CONFIRMED: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
} as const satisfies Record<OrderStatus, "warning" | "info" | "success" | "danger">;

export const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const paymentTones = {
  UNPAID: "warning",
  PAID: "success",
  REFUNDED: "neutral",
} as const satisfies Record<PaymentStatus, "warning" | "success" | "neutral">;

type OrderForDisplay = {
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  customerName: string;
  phone: string;
  email: string | null;
  address: unknown;
  note: string | null;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  couponCode: string | null;
  shippingName: string | null;
  items: {
    id: string;
    titleSnapshot: string;
    optionsSnapshot: unknown;
    imageSnapshot: string | null;
    unitPriceCents: number;
    qty: number;
  }[];
};

/** Shared by the confirmation page, order lookup and the account order list. */
export function OrderDetail({
  order,
  money,
}: {
  order: OrderForDisplay;
  money: MoneyConfig;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {order.items.map((item) => {
            const options = describeOptions(parseOptions(item.optionsSnapshot));
            return (
              <li key={item.id} className="flex gap-4 p-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {item.imageSnapshot ? (
                    <Image
                      src={item.imageSnapshot}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-muted">
                      <ImageOff className="size-4" aria-hidden />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.titleSnapshot}</p>
                  {options && <p className="text-xs text-muted">{options}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {formatMoney(item.unitPriceCents, money)} × {item.qty}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatMoney(item.unitPriceCents * item.qty, money)}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Delivering to</h3>
            <address className="mt-2 text-sm text-muted not-italic">
              {order.customerName}
              <br />
              {formatAddress(order.address)}
              <br />
              {order.phone}
              {order.email && (
                <>
                  <br />
                  {order.email}
                </>
              )}
            </address>
          </div>

          {order.note && (
            <div>
              <h3 className="text-sm font-semibold">Order notes</h3>
              <p className="mt-2 text-sm text-muted">{order.note}</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Order {order.number}</h2>
          <Badge tone={statusTones[order.status]}>{statusLabels[order.status]}</Badge>
        </div>

        <p className="mt-1 text-xs text-muted">
          Placed{" "}
          {order.createdAt.toLocaleDateString(money.locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatMoney(order.subtotalCents, money)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Discount {order.couponCode && `(${order.couponCode})`}</dt>
              <dd>−{formatMoney(order.discountCents, money)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">
              Shipping{order.shippingName ? ` · ${order.shippingName}` : ""}
            </dt>
            <dd>
              {order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents, money)}
            </dd>
          </div>
          {order.taxCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Tax</dt>
              <dd>{formatMoney(order.taxCents, money)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalCents, money)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="text-muted">Payment</span>
          <Badge tone={paymentTones[order.paymentStatus]}>{order.paymentStatus}</Badge>
        </div>
      </div>
    </div>
  );
}
