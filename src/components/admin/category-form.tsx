"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { saveCategory } from "@/app/actions/admin/categories";
import { attributeTypes, type AttributeField, type AttributeType } from "@/lib/types";
import type { CategoryFormData } from "@/lib/admin-forms";
import { slugify } from "@/lib/utils";
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

const typeLabels: Record<AttributeType, string> = {
  text: "Text",
  number: "Number",
  select: "Dropdown (one)",
  multiselect: "Checkboxes (many)",
  boolean: "Yes / No",
};

/**
 * The attribute-schema editor is what lets this store fit any product type:
 * the fields defined here become inputs on the product form, rows in the PDP
 * spec table, and (when filterable) storefront facets.
 */
export function CategoryForm({
  category,
  parents,
}: {
  category: CategoryFormData;
  parents: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    saveCategory,
    null,
  );

  const [fields, setFields] = useState<AttributeField[]>(category.attributeSchema);
  const [image, setImage] = useState<string[]>(
    category.imageUrl ? [category.imageUrl] : [],
  );

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  function update(index: number, patch: Partial<AttributeField>) {
    const next = [...fields];
    next[index] = { ...next[index], ...patch };
    setFields(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next);
  }

  return (
    <form action={formAction} className="space-y-6">
      {category.id && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="imageUrl" value={image[0] ?? ""} />
      <input type="hidden" name="attributeSchema" value={JSON.stringify(fields)} />

      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <Field label="Name" required error={errors.name} htmlFor="name">
              <Input id="name" name="name" defaultValue={category.name} required />
            </Field>

            <Field
              label="Slug"
              hint="Leave blank to generate from the name."
              error={errors.slug}
              htmlFor="slug"
            >
              <Input id="slug" name="slug" defaultValue={category.slug} />
            </Field>

            <Field label="Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                defaultValue={category.description}
                rows={3}
              />
            </Field>

            <ImageUploader value={image} onChange={setImage} label="Category image" single />
          </Card>

          <Card className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold">Custom fields</h2>
                <p className="mt-1 text-xs text-muted">
                  Define what a product in this category needs — RAM and CPU for
                  laptops, fabric and fit for clothing. These become fields on the
                  product form and specs on the product page.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFields([
                    ...fields,
                    {
                      key: "",
                      label: "",
                      type: "text",
                      options: [],
                      required: false,
                      filterable: false,
                    },
                  ])
                }
              >
                <Plus className="size-3.5" />
                Add field
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">
                No custom fields. Products in this category will just have the
                standard title, price, images and variants.
              </p>
            )}

            {fields.map((field, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-line p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Label (e.g. Screen size)"
                    value={field.label}
                    onChange={(e) => {
                      // Auto-derive the storage key from the label until it's edited.
                      const label = e.target.value;
                      const autoKey =
                        !field.key || field.key === slugify(field.label).replace(/-/g, "_");
                      update(index, {
                        label,
                        ...(autoKey ? { key: slugify(label).replace(/-/g, "_") } : {}),
                      });
                    }}
                  />
                  <Select
                    value={field.type}
                    onChange={(e) =>
                      update(index, { type: e.target.value as AttributeType })
                    }
                    className="max-w-44"
                  >
                    {attributeTypes.map((type) => (
                      <option key={type} value={type}>
                        {typeLabels[type]}
                      </option>
                    ))}
                  </Select>

                  <div className="flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => move(index, 1)}
                      disabled={index === fields.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFields(fields.filter((_, i) => i !== index))}
                      aria-label="Remove field"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {(field.type === "select" || field.type === "multiselect") && (
                  <Input
                    placeholder="Choices, comma separated (8GB, 16GB, 32GB)"
                    value={field.options.join(", ")}
                    onChange={(e) =>
                      update(index, {
                        options: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}

                {field.type === "number" && (
                  <Input
                    placeholder="Unit (optional, e.g. in, kg, months)"
                    value={field.unit ?? ""}
                    onChange={(e) => update(index, { unit: e.target.value })}
                    className="max-w-48"
                  />
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => update(index, { required: e.target.checked })}
                      className="size-4 accent-[var(--store-accent)]"
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={field.filterable}
                      onChange={(e) => update(index, { filterable: e.target.checked })}
                      className="size-4 accent-[var(--store-accent)]"
                    />
                    Show as a storefront filter
                  </label>
                  {field.key && (
                    <span className="text-xs text-muted">
                      key: <code>{field.key}</code>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <Field label="Parent category" htmlFor="parentId">
              <Select id="parentId" name="parentId" defaultValue={category.parentId}>
                <option value="">None (top level)</option>
                {parents
                  .filter((p) => p.id !== category.id)
                  .map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="Sort order" hint="Lower numbers appear first." htmlFor="sortOrder">
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={category.sortOrder}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                defaultChecked={category.active}
                className="size-4 accent-[var(--store-accent)]"
              />
              Visible in the store
            </label>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save category
            </Button>
          </Card>
        </div>
      </div>
    </form>
  );
}
