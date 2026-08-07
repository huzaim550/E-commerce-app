"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { failure, success, type ActionResult } from "@/lib/validation";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";

const orderStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const paymentStatuses: PaymentStatus[] = ["UNPAID", "PAID", "REFUNDED"];

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  const staff = await requireStaff();

  if (!orderStatuses.includes(status as OrderStatus)) {
    return failure("Unknown order status.");
  }
  const next = status as OrderStatus;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return failure("Order not found.");
  if (order.status === next) return success(undefined, "Already in that status.");

  await prisma.$transaction(async (tx) => {
    // Cancelling returns stock; un-cancelling takes it back out.
    if (next === "CANCELLED" && order.status !== "CANCELLED") {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { increment: item.qty } },
        });
      }
    } else if (order.status === "CANCELLED" && next !== "CANCELLED") {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { decrement: item.qty } },
        });
      }
    }

    await tx.order.update({ where: { id: orderId }, data: { status: next } });
    await tx.orderEvent.create({
      data: {
        orderId,
        type: "status_changed",
        note: `${order.status} → ${next} by ${staff.email}`,
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return success(undefined, `Order marked ${next.toLowerCase()}.`);
}

export async function updatePaymentStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  const staff = await requireStaff();

  if (!paymentStatuses.includes(status as PaymentStatus)) {
    return failure("Unknown payment status.");
  }
  const next = status as PaymentStatus;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { paymentStatus: true },
  });
  if (!order) return failure("Order not found.");

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { paymentStatus: next } }),
    prisma.orderEvent.create({
      data: {
        orderId,
        type: "payment_changed",
        note: `${order.paymentStatus} → ${next} by ${staff.email}`,
      },
    }),
  ]);

  revalidatePath(`/admin/orders/${orderId}`);
  return success(undefined, `Payment marked ${next.toLowerCase()}.`);
}

export async function addOrderNote(
  orderId: string,
  note: string,
): Promise<ActionResult> {
  const staff = await requireStaff();

  const trimmed = note.trim();
  if (!trimmed) return failure("Write something first.");

  await prisma.orderEvent.create({
    data: { orderId, type: "note", note: `${trimmed} — ${staff.email}` },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return success(undefined, "Note added.");
}
