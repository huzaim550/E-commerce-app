import { Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney, centsToInput } from "@/lib/money";
import { PageHeader } from "@/components/admin/page-header";
import { ShippingRateForm } from "@/components/admin/simple-forms";
import { CollapsibleCreate } from "@/components/admin/collapsible-create";
import { RowActions } from "@/components/admin/row-actions";
import { Badge, Card, EmptyState } from "@/components/ui";

const typeLabels = {
  FLAT: "Flat rate",
  FREE_OVER: "Free over",
  WEIGHT: "Weight based",
} as const;

export default async function AdminShippingPage() {
  const [settings, rates] = await Promise.all([
    getSettings(),
    prisma.shippingRate.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <>
      <PageHeader
        title="Shipping"
        description="Delivery options customers pick from at checkout."
      />

      <div className="mb-6">
        <CollapsibleCreate label="New shipping rate">
          <ShippingRateForm currencySymbol={settings.currencySymbol} />
        </CollapsibleCreate>
      </div>

      {rates.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-8" />}
          title="No shipping rates"
          description="Without a rate, checkout shows no delivery options and shipping is free."
        />
      ) : (
        <div className="space-y-4">
          {rates.map((rate) => (
            <Card key={rate.id}>
              <div className="mb-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{rate.name}</p>
                  <p className="text-xs text-muted">
                    {typeLabels[rate.type]}
                    {rate.type === "FREE_OVER" && rate.thresholdCents
                      ? ` ${formatMoney(rate.thresholdCents, settings)}`
                      : ""}
                    {" · "}
                    {rate.amountCents === 0
                      ? "Free"
                      : formatMoney(rate.amountCents, settings)}
                    {rate.regions.length > 0 && ` · ${rate.regions.join(", ")}`}
                  </p>
                </div>
                <Badge tone={rate.active ? "success" : "neutral"}>
                  {rate.active ? "Active" : "Hidden"}
                </Badge>
                <RowActions id={rate.id} kind="shipping" />
              </div>

              <details>
                <summary className="cursor-pointer text-sm text-accent">Edit</summary>
                <div className="mt-4 border-t border-line pt-4">
                  <ShippingRateForm
                    currencySymbol={settings.currencySymbol}
                    rate={{
                      id: rate.id,
                      name: rate.name,
                      type: rate.type,
                      amount: centsToInput(rate.amountCents),
                      threshold: rate.thresholdCents
                        ? centsToInput(rate.thresholdCents)
                        : "",
                      perKg: rate.perKgCents ? centsToInput(rate.perKgCents) : "",
                      regions: rate.regions.join(", "),
                      sortOrder: rate.sortOrder,
                      active: rate.active,
                    }}
                  />
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
