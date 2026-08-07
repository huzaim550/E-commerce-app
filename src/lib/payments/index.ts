import type { PaymentMethod } from "@/generated/prisma/enums";
import type { Totals } from "@/lib/pricing";

/**
 * Cash on delivery is the only provider today. The seam exists so adding a
 * gateway later is a new file plus a registry entry, not a checkout rewrite:
 * `begin` runs inside order creation, `confirm` is what a webhook would call.
 */

export type PaymentContext = {
  orderNumber: string;
  totals: Totals;
  customerName: string;
  email?: string | null;
};

export type PaymentInit = {
  /** Where to send the customer next; null means stay on the confirmation page. */
  redirectUrl: string | null;
  paymentStatus: "UNPAID" | "PAID";
};

export interface PaymentProvider {
  method: PaymentMethod;
  label: string;
  description: string;
  begin(context: PaymentContext): Promise<PaymentInit>;
}

const cod: PaymentProvider = {
  method: "COD",
  label: "Cash on delivery",
  description: "Pay with cash when your order arrives.",
  async begin() {
    return { redirectUrl: null, paymentStatus: "UNPAID" };
  },
};

const manual: PaymentProvider = {
  method: "MANUAL",
  label: "Bank transfer",
  description: "Pay by transfer; we'll confirm your order once payment clears.",
  async begin() {
    return { redirectUrl: null, paymentStatus: "UNPAID" };
  },
};

export const paymentProviders: Record<PaymentMethod, PaymentProvider> = {
  COD: cod,
  MANUAL: manual,
};

/** Methods offered at checkout, in display order. */
export const enabledPaymentMethods: PaymentMethod[] = ["COD"];

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  return paymentProviders[method] ?? cod;
}
