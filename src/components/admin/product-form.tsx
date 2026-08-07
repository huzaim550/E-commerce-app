"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";
import { saveProduct } from "@/app/actions/admin/products";
import type { AttributeField } from "@/lib/types";
import type {
  ProductFormData,
  OptionGroupRow,
  VariantRow,
} from "@/lib/admin-forms";
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

export function ProductForm({
  product,
  categories,
  currencySymbol,
}: {
  product: ProductFormData;
  categories: { id: string; name: string; attributeSchema: AttributeField[] }[];
  currencySymbol: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveProduct,
    null,
  );

  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [images, setImages] = useState<string[]>(product.images);
  const [optionGroups, setOptionGroups] = useState<OptionGroupRow[]>(product.optionGroups);
  const [variants, setVariants] = useState<VariantRow[]>(product.variants);

  // The selected category decides which custom fields this product gets.
  const attributeFields = useMemo(
    () => categories.find((c) => c.id === categoryId)?.attributeSchema ?? [],
    [categories, categoryId],
  );

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  /**
   * Regenerates the variant matrix from the option groups, preserving stock,
   * price and SKU for combinations that already exist.
   */
  function generateVariants() {
    const valid = optionGroups.filter((g) => g.name.trim() && g.values.length > 0);

    if (valid.length === 0) {
      setVariants([
        variants[0] ?? { name: "Default", options: {}, price: "", sku: "", stock: 0 },
      ]);
      return;
    }

    let combos: Record<string, string>[] = [{}];
    for (const group of valid) {
      combos = combos.flatMap((combo) =>
        group.values.map((value) => ({ ...combo, [group.name.trim()]: value })),
      );
    }

    const keyOf = (options: Record<string, string>) =>
      Object.entries(options)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("|");

    const existing = new Map(variants.map((v) => [keyOf(v.options), v]));

    setVariants(
      combos.map((options) => {
        const prior = existing.get(keyOf(options));
        return {
          id: prior?.id,
          name: Object.values(options).join(" / "),
          options,
          price: prior?.price ?? "",
          sku: prior?.sku ?? "",
          stock: prior?.stock ?? 0,
        };
      }),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="optionGroups" value={JSON.stringify(optionGroups)} />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />

      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <Field label="Title" required error={errors.title} htmlFor="title">
              <Input id="title" name="title" defaultValue={product.title} required />
            </Field>

            <Field
              label="Slug"
              hint="Leave blank to generate from the title."
              error={errors.slug}
              htmlFor="slug"
            >
              <Input id="slug" name="slug" defaultValue={product.slug} />
            </Field>

            <Field
              label="Description"
              hint="Markdown is supported."
              error={errors.description}
              htmlFor="description"
            >
              <Textarea
                id="description"
                name="description"
                defaultValue={product.description}
                rows={8}
              />
            </Field>
          </Card>

          <Card>
            <ImageUploader value={images} onChange={setImages} />
          </Card>

          {/* Custom fields, driven entirely by the category's schema. */}
          {attributeFields.length > 0 && (
            <Card className="space-y-4">
              <div>
                <h2 className="font-semibold">Specifications</h2>
                <p className="mt-1 text-xs text-muted">
                  These fields come from the selected category. Edit them under
                  Categories.
                </p>
              </div>

              {attributeFields.map((field) => {
                const value = product.attributes[field.key];
                const name = `attr_${field.key}`;

                if (field.type === "boolean") {
                  return (
                    <label key={field.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={name}
                        defaultChecked={Boolean(value)}
                        className="size-4 accent-[var(--store-accent)]"
                      />
                      {field.label}
                    </label>
                  );
                }

                if (field.type === "select") {
                  return (
                    <Field key={field.key} label={field.label} required={field.required}>
                      <Select name={name} defaultValue={String(value ?? "")}>
                        <option value="">—</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  );
                }

                if (field.type === "multiselect") {
                  const selected = Array.isArray(value) ? value : [];
                  return (
                    <Field key={field.key} label={field.label} required={field.required}>
                      <div className="flex flex-wrap gap-3">
                        {field.options.map((option) => (
                          <label key={option} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              name={name}
                              value={option}
                              defaultChecked={selected.includes(option)}
                              className="size-4 accent-[var(--store-accent)]"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </Field>
                  );
                }

                return (
                  <Field
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    hint={field.unit ? `In ${field.unit}` : undefined}
                  >
                    <Input
                      name={name}
                      type={field.type === "number" ? "number" : "text"}
                      step={field.type === "number" ? "any" : undefined}
                      defaultValue={String(value ?? "")}
                    />
                  </Field>
                );
              })}
            </Card>
          )}

          {/* Options + variants */}
          <Card className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold">Options &amp; variants</h2>
                <p className="mt-1 text-xs text-muted">
                  Add options like Size or Colour, then generate the combinations.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setOptionGroups([...optionGroups, { name: "", values: [] }])
                }
              >
                <Plus className="size-3.5" />
                Add option
              </Button>
            </div>

            {optionGroups.map((group, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Option name (e.g. Size)"
                  value={group.name}
                  onChange={(e) => {
                    const next = [...optionGroups];
                    next[index] = { ...group, name: e.target.value };
                    setOptionGroups(next);
                  }}
                  className="max-w-44"
                />
                <Input
                  placeholder="Values, comma separated (S, M, L)"
                  value={group.values.join(", ")}
                  onChange={(e) => {
                    const next = [...optionGroups];
                    next[index] = {
                      ...group,
                      values: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    };
                    setOptionGroups(next);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOptionGroups(optionGroups.filter((_, i) => i !== index))}
                  aria-label="Remove option"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            {optionGroups.length > 0 && (
              <Button type="button" variant="subtle" size="sm" onClick={generateVariants}>
                <Wand2 className="size-3.5" />
                Generate variants
              </Button>
            )}

            {variants.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="pb-2 font-medium">Variant</th>
                      <th className="pb-2 font-medium">Price</th>
                      <th className="pb-2 font-medium">SKU</th>
                      <th className="pb-2 font-medium">Stock</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {variants.map((variant, index) => (
                      <tr key={index}>
                        <td className="py-2 pr-3 font-medium">{variant.name || "Default"}</td>
                        <td className="py-2 pr-3">
                          <Input
                            placeholder={`${currencySymbol} base`}
                            value={variant.price}
                            onChange={(e) => {
                              const next = [...variants];
                              next[index] = { ...variant, price: e.target.value };
                              setVariants(next);
                            }}
                            className="w-24"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            value={variant.sku}
                            onChange={(e) => {
                              const next = [...variants];
                              next[index] = { ...variant, sku: e.target.value };
                              setVariants(next);
                            }}
                            className="w-28"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            type="number"
                            min={0}
                            value={variant.stock}
                            onChange={(e) => {
                              const next = [...variants];
                              next[index] = { ...variant, stock: Number(e.target.value) };
                              setVariants(next);
                            }}
                            className="w-20"
                          />
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                            aria-label="Remove variant"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted">
                  Leave a price blank to inherit the base price.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={product.status}>
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </Field>

            <Field label="Category" htmlFor="categoryId">
              <Select
                id="categoryId"
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={product.featured}
                className="size-4 accent-[var(--store-accent)]"
              />
              Featured on the homepage
            </label>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save product
            </Button>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-semibold">Pricing</h2>

            <Field label="Price" required error={errors.basePrice} htmlFor="basePrice">
              <Input
                id="basePrice"
                name="basePrice"
                defaultValue={product.basePrice}
                placeholder={`${currencySymbol}0.00`}
                required
              />
            </Field>

            <Field
              label="Compare-at price"
              hint="Shown struck through, to signal a discount."
              error={errors.comparePrice}
              htmlFor="comparePrice"
            >
              <Input
                id="comparePrice"
                name="comparePrice"
                defaultValue={product.comparePrice}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="taxable"
                defaultChecked={product.taxable}
                className="size-4 accent-[var(--store-accent)]"
              />
              Charge tax on this product
            </label>

            <Field
              label="Weight"
              hint="Grams. Used by weight-based shipping."
              htmlFor="weightGrams"
            >
              <Input
                id="weightGrams"
                name="weightGrams"
                type="number"
                min={0}
                defaultValue={product.weightGrams}
              />
            </Field>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-semibold">Search &amp; SEO</h2>

            <Field label="Tags" hint="Comma separated." htmlFor="tags">
              <Input id="tags" name="tags" defaultValue={product.tags} />
            </Field>

            <Field label="SEO title" htmlFor="seoTitle">
              <Input id="seoTitle" name="seoTitle" defaultValue={product.seoTitle} />
            </Field>

            <Field label="Meta description" htmlFor="seoDescription">
              <Textarea
                id="seoDescription"
                name="seoDescription"
                defaultValue={product.seoDescription}
                rows={3}
              />
            </Field>
          </Card>
        </div>
      </div>
    </form>
  );
}
