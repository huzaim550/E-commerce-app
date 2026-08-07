import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { OrderDetail } from "@/components/store/order-detail";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Order confirmation",
  // Order pages are reachable by anyone holding the number; keep them out of search.
  robots: { index: false, follow: false },
};

export default async function OrderPage(props: PageProps<"/order/[number]">) {
  const { number } = await props.params;

  const [settings, order] = await Promise.all([
    getSettings(),
    prisma.order.findUnique({
      where: { number: decodeURIComponent(number) },
      include: { items: true },
    }),
  ]);

  if (!order) notFound();

  return (
    <div className="container-store py-10">
      <div className="mb-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Thank you!</h1>
        <p className="mt-2 text-sm text-muted">
          Your order <span className="font-medium text-fg">{order.number}</span> has been
          placed. Keep this number to track it.
        </p>
        <ButtonLink href="/products" variant="outline" className="mt-6">
          Continue shopping
        </ButtonLink>
      </div>

      <OrderDetail order={order} money={settings} />
    </div>
  );
}
