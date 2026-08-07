"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { saveSettings } from "@/app/actions/admin/settings";
import { currencies, findCurrency } from "@/lib/currencies";
import { formatMoney } from "@/lib/money";
import type { Socials } from "@/lib/types";
import { ImageUploader } from "@/components/admin/image-uploader";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import type { ActionResult } from "@/lib/validation";

export type SettingsFormData = {
  storeName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  taxRatePct: number;
  taxInclusive: boolean;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  orderPrefix: string;
  seoTitle: string;
  seoDescription: string;
  socials: Socials;
};

const socialFields = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X" },
  { key: "tiktok", label: "TikTok" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "youtube", label: "YouTube" },
] as const;

export function SettingsForm({ settings }: { settings: SettingsFormData }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveSettings,
    null,
  );

  const [logo, setLogo] = useState(settings.logoUrl ? [settings.logoUrl] : []);
  const [favicon, setFavicon] = useState(
    settings.faviconUrl ? [settings.faviconUrl] : [],
  );
  const [primary, setPrimary] = useState(settings.primaryColor);
  const [accent, setAccent] = useState(settings.accentColor);

  const [currency, setCurrency] = useState(settings.currency);
  const [symbol, setSymbol] = useState(settings.currencySymbol);
  const [locale, setLocale] = useState(settings.locale);
  // A store already using a currency outside the list stays on the custom path.
  const [isCustomCurrency, setIsCustomCurrency] = useState(
    () => !findCurrency(settings.currency),
  );

  const preview = useMemo(
    () => formatMoney(129900, { currency, currencySymbol: symbol, locale }),
    [currency, symbol, locale],
  );

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="logoUrl" value={logo[0] ?? ""} />
      <input type="hidden" name="faviconUrl" value={favicon[0] ?? ""} />

      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-semibold">Store identity</h2>

          <Field label="Store name" required error={errors.storeName} htmlFor="storeName">
            <Input
              id="storeName"
              name="storeName"
              defaultValue={settings.storeName}
              required
            />
          </Field>

          <Field label="Tagline" htmlFor="tagline">
            <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
          </Field>

          <ImageUploader value={logo} onChange={setLogo} label="Logo" single />
          <ImageUploader value={favicon} onChange={setFavicon} label="Favicon" single />
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="font-semibold">Appearance</h2>
            <p className="mt-1 text-xs text-muted">
              These colours restyle the whole storefront — no rebuild needed.
            </p>
          </div>

          <Field label="Primary colour" error={errors.primaryColor} htmlFor="primaryColor">
            <div className="flex gap-2">
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-bg"
                aria-label="Pick primary colour"
              />
              <Input
                id="primaryColor"
                name="primaryColor"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Accent colour" error={errors.accentColor} htmlFor="accentColor">
            <div className="flex gap-2">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-bg"
                aria-label="Pick accent colour"
              />
              <Input
                id="accentColor"
                name="accentColor"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Font" htmlFor="fontFamily">
            <Select id="fontFamily" name="fontFamily" defaultValue={settings.fontFamily}>
              <option value="sans">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </Select>
          </Field>

          {/* Live preview so the admin doesn't have to save to see the effect. */}
          <div className="rounded-lg border border-line p-4">
            <p className="mb-2 text-xs text-muted">Preview</p>
            <div className="flex gap-2">
              <span
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: primary }}
              >
                Primary
              </span>
              <span
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: accent }}
              >
                Accent
              </span>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold">Currency &amp; tax</h2>

          <Field
            label="Currency"
            hint="Sets how every price on the store is displayed."
            error={errors.currency}
            htmlFor="currencyPicker"
          >
            <Select
              id="currencyPicker"
              value={isCustomCurrency ? "__custom__" : currency}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "__custom__") {
                  setIsCustomCurrency(true);
                  return;
                }
                // Picking a currency fills in the symbol and a sensible
                // formatting locale, so the admin never has to know BCP 47.
                const option = findCurrency(next);
                setIsCustomCurrency(false);
                setCurrency(next);
                if (option) {
                  setSymbol(option.symbol);
                  setLocale(option.locale);
                }
              }}
            >
              {currencies.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} — {option.name} ({option.symbol})
                </option>
              ))}
              <option value="__custom__">Something else…</option>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Code"
              hint={isCustomCurrency ? "ISO 4217, e.g. BHD" : undefined}
              error={errors.currency}
              htmlFor="currency"
            >
              <Input
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                readOnly={!isCustomCurrency}
                className={isCustomCurrency ? "" : "bg-surface"}
                required
              />
            </Field>

            <Field
              label="Symbol"
              hint="Fallback only."
              error={errors.currencySymbol}
              htmlFor="currencySymbol"
            >
              <Input
                id="currencySymbol"
                name="currencySymbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Locale"
              hint="Number format."
              error={errors.locale}
              htmlFor="locale"
            >
              <Input
                id="locale"
                name="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                required
              />
            </Field>
          </div>

          {/* Shows exactly how a price will render, before saving. */}
          <div className="rounded-lg border border-line px-4 py-3 text-sm">
            <span className="text-muted">Prices will look like </span>
            <span className="font-semibold">{preview}</span>
          </div>

          <Field label="Tax rate (%)" error={errors.taxRatePct} htmlFor="taxRatePct">
            <Input
              id="taxRatePct"
              name="taxRatePct"
              type="number"
              step="0.01"
              min={0}
              max={100}
              defaultValue={settings.taxRatePct}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="taxInclusive"
              defaultChecked={settings.taxInclusive}
              className="size-4 accent-[var(--store-accent)]"
            />
            Prices already include tax
          </label>

          <Field
            label="Order number prefix"
            hint="Order numbers look like PREFIX-260807-1234."
            htmlFor="orderPrefix"
          >
            <Input
              id="orderPrefix"
              name="orderPrefix"
              defaultValue={settings.orderPrefix}
              className="max-w-32"
            />
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold">Contact &amp; social</h2>

          <Field label="Email" htmlFor="contactEmail">
            <Input id="contactEmail" name="contactEmail" defaultValue={settings.contactEmail} />
          </Field>

          <Field label="Phone" htmlFor="contactPhone">
            <Input id="contactPhone" name="contactPhone" defaultValue={settings.contactPhone} />
          </Field>

          <Field label="Address" htmlFor="contactAddress">
            <Input
              id="contactAddress"
              name="contactAddress"
              defaultValue={settings.contactAddress}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            {socialFields.map((social) => (
              <Field key={social.key} label={social.label}>
                <Input
                  name={`social_${social.key}`}
                  defaultValue={settings.socials[social.key] ?? ""}
                  placeholder="https://…"
                />
              </Field>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-2">
          <h2 className="font-semibold">SEO</h2>

          <Field label="Default page title" htmlFor="seoTitle">
            <Input id="seoTitle" name="seoTitle" defaultValue={settings.seoTitle} />
          </Field>

          <Field label="Meta description" htmlFor="seoDescription">
            <Textarea
              id="seoDescription"
              name="seoDescription"
              defaultValue={settings.seoDescription}
              rows={3}
            />
          </Field>
        </Card>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="shadow-lg">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </form>
  );
}
