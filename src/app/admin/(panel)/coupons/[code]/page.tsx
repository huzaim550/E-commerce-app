import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { centsToInput } from "@/lib/money";
import { PageHeader } from "@/components/admin/page-header";
import { CouponForm } from "@/components/admin/simple-forms";
import { Card } from "@/components/ui";

const asDateInput = (date: Date | null) =>
  date ? date.toISOString().slice(0, 10) : "";

export default async function EditCouponPage(
  props: PageProps<"/admin/coupons/[code]">,
) {
  const { code } = await props.params;

  const [settings, coupon] = await Promise.all([
    getSettings(),
    prisma.coupon.findUnique({ where: { code: decodeURIComponent(code) } }),
  ]);

  if (!coupon) notFound();

  return (
    <>
      <PageHeader
        title={coupon.code}
        description={`Redeemed ${coupon.usedCount} time${coupon.usedCount === 1 ? "" : "s"}`}
      />

      <Card className="max-w-2xl">
        <CouponForm
          currencySymbol={settings.currencySymbol}
          coupon={{
            code: coupon.code,
            type: coupon.type,
            // PERCENT stores a whole number; FIXED stores minor units.
            value:
              coupon.type === "PERCENT"
                ? String(coupon.value)
                : centsToInput(coupon.value),
            minOrder: coupon.minOrderCents ? centsToInput(coupon.minOrderCents) : "",
            maxUses: coupon.maxUses !== null ? String(coupon.maxUses) : "",
            startsAt: asDateInput(coupon.startsAt),
            expiresAt: asDateInput(coupon.expiresAt),
            active: coupon.active,
          }}
        />
      </Card>
    </>
  );
}
