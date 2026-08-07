"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  saveCoupon,
  saveShippingRate,
  savePage,
} from "@/app/actions/admin/catalog-extras";
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

/** Inline create/edit forms for the smaller admin resources. */

export function CouponForm({
  coupon,
  currencySymbol,
  onDone,
}: {
  coupon?: {
    code: string;
    type: string;
    value: string;
    minOrder: string;
    maxUses: string;
    startsAt: string;
    expiresAt: string;
    active: boolean;
  };
  currencySymbol: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await saveCoupon(prev, formData);
      if (result.ok) onDone?.();
      return result;
    },
    null,
  );

  const [type, setType] = useState(coupon?.type ?? "PERCENT");
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      {coupon && <input type="hidden" name="originalCode" value={coupon.code} />}
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" required error={errors.code} htmlFor="code">
          <Input
            id="code"
            name="code"
            defaultValue={coupon?.code}
            placeholder="WELCOME10"
            readOnly={Boolean(coupon)}
            required
          />
        </Field>

        <Field label="Type" htmlFor="type">
          <Select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="PERCENT">Percentage off</option>
            <option value="FIXED">Fixed amount off</option>
          </Select>
        </Field>

        <Field
          label={type === "PERCENT" ? "Percent off" : "Amount off"}
          required
          error={errors.value}
          hint={type === "PERCENT" ? "1–100" : `In ${currencySymbol}`}
          htmlFor="value"
        >
          <Input id="value" name="value" defaultValue={coupon?.value} required />
        </Field>

        <Field label="Minimum order" hint="Optional." htmlFor="minOrder">
          <Input id="minOrder" name="minOrder" defaultValue={coupon?.minOrder} />
        </Field>

        <Field label="Max uses" hint="Blank for unlimited." htmlFor="maxUses">
          <Input id="maxUses" name="maxUses" type="number" min={1} defaultValue={coupon?.maxUses} />
        </Field>

        <div />

        <Field label="Starts" htmlFor="startsAt">
          <Input id="startsAt" name="startsAt" type="date" defaultValue={coupon?.startsAt} />
        </Field>

        <Field label="Expires" htmlFor="expiresAt">
          <Input id="expiresAt" name="expiresAt" type="date" defaultValue={coupon?.expiresAt} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={coupon?.active ?? true}
          className="size-4 accent-[var(--store-accent)]"
        />
        Active
      </label>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {coupon ? "Save coupon" : "Create coupon"}
      </Button>
    </form>
  );
}

export function ShippingRateForm({
  rate,
  currencySymbol,
  onDone,
}: {
  rate?: {
    id: string;
    name: string;
    type: string;
    amount: string;
    threshold: string;
    perKg: string;
    regions: string;
    sortOrder: number;
    active: boolean;
  };
  currencySymbol: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) => {
      const result = await saveShippingRate(prev, formData);
      if (result.ok) onDone?.();
      return result;
    },
    null,
  );

  const [type, setType] = useState(rate?.type ?? "FLAT");
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      {rate && <input type="hidden" name="id" value={rate.id} />}
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name} htmlFor="name">
          <Input id="name" name="name" defaultValue={rate?.name} placeholder="Standard delivery" required />
        </Field>

        <Field label="Type" htmlFor="type">
          <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="FLAT">Flat rate</option>
            <option value="FREE_OVER">Free over an amount</option>
            <option value="WEIGHT">Weight based</option>
          </Select>
        </Field>

        <Field
          label="Amount"
          hint={type === "WEIGHT" ? "Base charge before weight." : `In ${currencySymbol}`}
          htmlFor="amount"
        >
          <Input id="amount" name="amount" defaultValue={rate?.amount ?? "0"} />
        </Field>

        {type === "FREE_OVER" && (
          <Field
            label="Free over"
            required
            error={errors.threshold}
            hint="Order value at which shipping becomes free."
            htmlFor="threshold"
          >
            <Input id="threshold" name="threshold" defaultValue={rate?.threshold} />
          </Field>
        )}

        {type === "WEIGHT" && (
          <Field label="Per kg" hint="Added per kilogram, rounded up." htmlFor="perKg">
            <Input id="perKg" name="perKg" defaultValue={rate?.perKg} />
          </Field>
        )}

        <Field
          label="Regions"
          hint="Comma separated. Blank means everywhere."
          htmlFor="regions"
        >
          <Input id="regions" name="regions" defaultValue={rate?.regions} />
        </Field>

        <Field label="Sort order" htmlFor="sortOrder">
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={rate?.sortOrder ?? 0}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={rate?.active ?? true}
          className="size-4 accent-[var(--store-accent)]"
        />
        Offer this at checkout
      </label>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {rate ? "Save rate" : "Create rate"}
      </Button>
    </form>
  );
}

export function PageForm({
  page,
}: {
  page?: {
    id: string;
    title: string;
    slug: string;
    body: string;
    published: boolean;
    showInFooter: boolean;
    sortOrder: number;
    seoDescription: string;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    savePage,
    null,
  );
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      {page && <input type="hidden" name="id" value={page.id} />}
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="space-y-4">
          <Field label="Title" required error={errors.title} htmlFor="title">
            <Input id="title" name="title" defaultValue={page?.title} required />
          </Field>

          <Field
            label="Slug"
            hint="The page lives at /p/slug. Blank generates from the title."
            error={errors.slug}
            htmlFor="slug"
          >
            <Input id="slug" name="slug" defaultValue={page?.slug} />
          </Field>

          <Field label="Content" hint="Markdown is supported." htmlFor="body">
            <Textarea id="body" name="body" defaultValue={page?.body} rows={18} />
          </Field>
        </Card>

        <Card className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={page?.published ?? true}
              className="size-4 accent-[var(--store-accent)]"
            />
            Published
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="showInFooter"
              defaultChecked={page?.showInFooter ?? true}
              className="size-4 accent-[var(--store-accent)]"
            />
            Link in the footer
          </label>

          <Field label="Sort order" htmlFor="sortOrder">
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={page?.sortOrder ?? 0}
            />
          </Field>

          <Field label="Meta description" htmlFor="seoDescription">
            <Textarea
              id="seoDescription"
              name="seoDescription"
              defaultValue={page?.seoDescription}
              rows={3}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save page
          </Button>
        </Card>
      </div>
    </form>
  );
}
