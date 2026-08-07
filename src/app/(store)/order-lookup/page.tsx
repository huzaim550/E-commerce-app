import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { OrderDetail } from "@/components/store/order-detail";
import { Button, Input, Field, Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Track your order" };

export default async function OrderLookupPage(props: PageProps<"/order-lookup">) {
  const params = await props.searchParams;
  const number = typeof params.number === "string" ? params.number.trim() : "";
  const phone = typeof params.phone === "string" ? params.phone.trim() : "";

  const settings = await getSettings();

  // Both the number *and* the phone must match — the number alone is guessable.
  const order =
    number && phone
      ? await prisma.order.findFirst({
          where: { number: { equals: number, mode: "insensitive" }, phone },
          include: { items: true },
        })
      : null;

  const searched = Boolean(number && phone);

  return (
    <div className="container-store py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Track your order</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the order number from your confirmation, plus the phone number you
          ordered with.
        </p>

        <form className="mt-6 space-y-4">
          <Field label="Order number" required htmlFor="number">
            <Input
              id="number"
              name="number"
              defaultValue={number}
              placeholder="ORD-260807-1234"
              required
            />
          </Field>
          <Field label="Phone number" required htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={phone} required />
          </Field>
          <Button type="submit" className="w-full">
            Find my order
          </Button>
        </form>

        {searched && !order && (
          <div className="mt-6">
            <Alert tone="error">
              We couldn&apos;t find an order with that number and phone number.
            </Alert>
          </div>
        )}
      </div>

      {order && (
        <div className="mt-12">
          <OrderDetail order={order} money={settings} />
        </div>
      )}
    </div>
  );
}
