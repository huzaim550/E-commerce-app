import Link from "next/link";
import { AlertTriangle, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/admin/page-header";
import { statusLabels, statusTones } from "@/components/store/order-detail";
import { Badge, Card, EmptyState } from "@/components/ui";

export default async function AdminDashboard() {
  const settings = await getSettings();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    revenue,
    orderCount,
    pendingCount,
    productCount,
    customerCount,
    recentOrders,
    lowStock,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { status: { not: "CANCELLED" }, createdAt: { gte: startOfMonth } },
    }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        number: true,
        customerName: true,
        status: true,
        totalCents: true,
        createdAt: true,
      },
    }),
    prisma.productVariant.findMany({
      where: { active: true, stock: { lte: 5 }, product: { status: "ACTIVE" } },
      orderBy: { stock: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        stock: true,
        product: { select: { id: true, title: true } },
      },
    }),
  ]);

  const stats = [
    {
      label: "Revenue this month",
      value: formatMoney(revenue._sum.totalCents ?? 0, settings),
      icon: TrendingUp,
    },
    { label: "Orders this month", value: String(orderCount), icon: ShoppingCart },
    { label: "Active products", value: String(productCount), icon: Package },
    { label: "Customers", value: String(customerCount), icon: Users },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          pendingCount > 0
            ? `${pendingCount} order${pendingCount === 1 ? "" : "s"} awaiting confirmation.`
            : "Everything is up to date."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{stat.label}</p>
              <stat.icon className="size-4 text-muted" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" description="They'll appear here as they come in." />
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{order.number}</p>
                      <p className="truncate text-xs text-muted">{order.customerName}</p>
                    </div>
                    <Badge tone={statusTones[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {formatMoney(order.totalCents, settings)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Low stock</h2>

          {lowStock.length === 0 ? (
            <EmptyState title="Stock looks healthy" description="Nothing at or below 5 units." />
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {lowStock.map((variant) => (
                <li key={variant.id}>
                  <Link
                    href={`/admin/products/${variant.product.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-surface"
                  >
                    <AlertTriangle
                      className={`size-4 shrink-0 ${
                        variant.stock === 0 ? "text-red-600" : "text-amber-500"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{variant.product.title}</p>
                      <p className="truncate text-xs text-muted">{variant.name}</p>
                    </div>
                    <Badge tone={variant.stock === 0 ? "danger" : "warning"}>
                      {variant.stock === 0 ? "Out of stock" : `${variant.stock} left`}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
