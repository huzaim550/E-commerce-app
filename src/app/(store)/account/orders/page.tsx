import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { requireCustomer } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { logout } from "@/app/actions/auth";
import { statusLabels, statusTones } from "@/components/store/order-detail";
import { Badge, Button, EmptyState, ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Your orders" };

export default async function AccountOrdersPage() {
  const user = await requireCustomer();
  const settings = await getSettings();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true, titleSnapshot: true, qty: true } } },
  });

  return (
    <div className="container-store py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {user.email}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="size-8" />}
          title="No orders yet"
          description="Orders you place while signed in will appear here."
          action={<ButtonLink href="/products">Start shopping</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/order/${order.number}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-4 hover:bg-surface"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{order.number}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {order.items.map((i) => `${i.titleSnapshot} ×${i.qty}`).join(", ")}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {order.createdAt.toLocaleDateString(settings.locale)}
                </p>
                <Badge tone={statusTones[order.status]}>{statusLabels[order.status]}</Badge>
                <p className="text-sm font-semibold">
                  {formatMoney(order.totalCents, settings)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
