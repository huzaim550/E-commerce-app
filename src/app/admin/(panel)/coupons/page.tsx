import Link from "next/link";
import { Ticket } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/components/admin/simple-forms";
import { CollapsibleCreate } from "@/components/admin/collapsible-create";
import { RowActions } from "@/components/admin/row-actions";
import { Badge, EmptyState } from "@/components/ui";

export default async function AdminCouponsPage() {
  const [settings, coupons] = await Promise.all([
    getSettings(),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const now = new Date();

  return (
    <>
      <PageHeader title="Coupons" description="Discount codes customers enter at checkout." />

      <div className="mb-6">
        <CollapsibleCreate label="New coupon">
          <CouponForm currencySymbol={settings.currencySymbol} />
        </CollapsibleCreate>
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={<Ticket className="size-8" />}
          title="No coupons yet"
          description="Create a code to offer a percentage or fixed discount."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted">
              <tr>
                <th className="p-3 font-medium">Code</th>
                <th className="p-3 font-medium">Discount</th>
                <th className="hidden p-3 font-medium sm:table-cell">Min. order</th>
                <th className="hidden p-3 font-medium sm:table-cell">Used</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((coupon) => {
                const expired = coupon.expiresAt !== null && coupon.expiresAt < now;
                const usedUp =
                  coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
                const live = coupon.active && !expired && !usedUp;

                return (
                  <tr key={coupon.code} className="hover:bg-surface">
                    <td className="p-3">
                      <Link
                        href={`/admin/coupons/${coupon.code}`}
                        className="font-mono font-medium hover:text-accent"
                      >
                        {coupon.code}
                      </Link>
                    </td>
                    <td className="p-3">
                      {coupon.type === "PERCENT"
                        ? `${coupon.value}% off`
                        : `${formatMoney(coupon.value, settings)} off`}
                    </td>
                    <td className="hidden p-3 text-muted sm:table-cell">
                      {coupon.minOrderCents
                        ? formatMoney(coupon.minOrderCents, settings)
                        : "—"}
                    </td>
                    <td className="hidden p-3 text-muted sm:table-cell">
                      {coupon.usedCount}
                      {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ""}
                    </td>
                    <td className="p-3">
                      <Badge tone={live ? "success" : "neutral"}>
                        {!coupon.active
                          ? "Inactive"
                          : expired
                            ? "Expired"
                            : usedUp
                              ? "Used up"
                              : "Live"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <RowActions
                        id={coupon.code}
                        editHref={`/admin/coupons/${coupon.code}`}
                        kind="coupon"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
