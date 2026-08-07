import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/admin/page-header";
import { statusLabels, statusTones, paymentTones } from "@/components/store/order-detail";
import { Badge, EmptyState, Input } from "@/components/ui";
import type { OrderStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const PER_PAGE = 25;

const filters: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const params = await props.searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (filters.some((f) => f.value === status && f.value)) {
    where.status = status as OrderStatus;
  }
  if (search) {
    where.OR = [
      { number: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [settings, orders, total] = await Promise.all([
    getSettings(),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (overrides: Record<string, string>) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (search) next.set("q", search);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.value || "all"}
            href={
              filter.value
                ? `/admin/orders?status=${filter.value}${search ? `&q=${search}` : ""}`
                : `/admin/orders${search ? `?q=${search}` : ""}`
            }
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === filter.value
                ? "border-primary bg-primary text-primary-fg"
                : "border-line text-muted hover:bg-surface"
            }`}
          >
            {filter.label}
          </Link>
        ))}

        <form className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <Input
            name="q"
            defaultValue={search}
            placeholder="Order number, name, phone…"
            className="w-64"
          />
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="size-8" />}
          title="No orders here"
          description={
            search || status
              ? "Try a different filter or search."
              : "Orders will appear here as customers check out."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs text-muted">
                <tr>
                  <th className="p-3 font-medium">Order</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Date</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="hidden p-3 font-medium sm:table-cell">Payment</th>
                  <th className="p-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface">
                    <td className="p-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium hover:text-accent"
                      >
                        {order.number}
                      </Link>
                      <p className="text-xs text-muted">
                        {order._count.items} item{order._count.items === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="p-3">
                      <p>{order.customerName}</p>
                      <p className="text-xs text-muted">{order.phone}</p>
                    </td>
                    <td className="hidden p-3 text-muted sm:table-cell">
                      {order.createdAt.toLocaleDateString(settings.locale)}
                    </td>
                    <td className="p-3">
                      <Badge tone={statusTones[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </td>
                    <td className="hidden p-3 sm:table-cell">
                      <Badge tone={paymentTones[order.paymentStatus]}>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-3 font-medium">
                      {formatMoney(order.totalCents, settings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={buildHref({ page: String(n) })}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    n === page
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-line hover:bg-surface"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
