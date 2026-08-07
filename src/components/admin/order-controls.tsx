"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  updateOrderStatus,
  updatePaymentStatus,
  addOrderNote,
} from "@/app/actions/admin/orders";
import { Alert, Button, Field, Select, Textarea } from "@/components/ui";

const orderStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const paymentStatuses = ["UNPAID", "PAID", "REFUNDED"];

export function OrderControls({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [note, setNote] = useState("");

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setFeedback(null);
    startTransition(async () => {
      const result = await fn();
      setFeedback(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "error", text: result.error ?? "Something went wrong." },
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

      <Field
        label="Order status"
        hint="Cancelling returns the reserved stock to inventory."
      >
        <Select
          value={status}
          disabled={pending}
          onChange={(e) => run(() => updateOrderStatus(orderId, e.target.value))}
        >
          {orderStatuses.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Payment status">
        <Select
          value={paymentStatus}
          disabled={pending}
          onChange={(e) => run(() => updatePaymentStatus(orderId, e.target.value))}
        >
          {paymentStatuses.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Add an internal note">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Called the customer to confirm the address…"
        />
      </Field>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending || !note.trim()}
        onClick={() =>
          run(async () => {
            const result = await addOrderNote(orderId, note);
            if (result.ok) setNote("");
            return result;
          })
        }
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Add note
      </Button>
    </div>
  );
}
