import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { parseSocials, parseHomeSections } from "@/lib/types";
import { storageDriverName } from "@/lib/storage";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { HomeSectionsEditor } from "@/components/admin/home-sections-editor";
import { Badge } from "@/components/ui";

export default async function AdminSettingsPage(props: PageProps<"/admin/settings">) {
  const params = await props.searchParams;
  const tab = params.tab === "homepage" ? "homepage" : "store";

  const settings = await getSettings();
  const driver = storageDriverName();

  const tabs = [
    { id: "store", label: "Store", href: "/admin/settings" },
    { id: "homepage", label: "Homepage", href: "/admin/settings?tab=homepage" },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Branding, currency, tax and the homepage layout."
        actions={
          <Badge tone={driver === "s3" ? "success" : "neutral"}>
            Uploads: {driver === "s3" ? "S3 / R2" : "local disk"}
          </Badge>
        }
      />

      <div className="mb-6 flex gap-2 border-b border-line">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === item.id
                ? "border-primary text-fg"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "homepage" ? (
        <HomeSectionsEditor initial={parseHomeSections(settings.homeSections)} />
      ) : (
        <SettingsForm
          settings={{
            storeName: settings.storeName,
            tagline: settings.tagline ?? "",
            logoUrl: settings.logoUrl ?? "",
            faviconUrl: settings.faviconUrl ?? "",
            primaryColor: settings.primaryColor,
            accentColor: settings.accentColor,
            fontFamily: settings.fontFamily,
            currency: settings.currency,
            currencySymbol: settings.currencySymbol,
            locale: settings.locale,
            taxRatePct: settings.taxRatePct,
            taxInclusive: settings.taxInclusive,
            contactEmail: settings.contactEmail ?? "",
            contactPhone: settings.contactPhone ?? "",
            contactAddress: settings.contactAddress ?? "",
            orderPrefix: settings.orderPrefix,
            seoTitle: settings.seoTitle ?? "",
            seoDescription: settings.seoDescription ?? "",
            socials: parseSocials(settings.socials),
          }}
        />
      )}
    </>
  );
}
