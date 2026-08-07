import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { OrderDetail } from "@/components/store/order-detail";
import { OrderControls } from "@/components/admin/order-controls";
import { Card } from "@/components/ui";

export default async function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;

  const [settings, order] = await Promise.all([
    getSettings(),
    prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        events: { orderBy: { createdAt: "desc" } },
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  if (!order) notFound();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">{order.number}</h1>
        <p className="mt-1 text-sm text-muted">
          {order.createdAt.toLocaleString(settings.locale)} ·{" "}
          {order.user ? `Account: ${order.user.email}` : "Guest checkout"} ·{" "}
          {order.paymentMethod === "COD" ? "Cash on delivery" : "Bank transfer"}
        </p>
      </div>

      <OrderDetail order={order} money={settings} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Manage order</h2>
          <OrderControls
            orderId={order.id}
            status={order.status}
            paymentStatus={order.paymentStatus}
          />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">History</h2>
          <ol className="space-y-3">
            {order.events.map((event) => (
              <li key={event.id} className="border-l-2 border-line pl-3">
                <p className="text-sm">{event.note ?? event.type}</p>
                <p className="text-xs text-muted">
                  {event.createdAt.toLocaleString(settings.locale)}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
