"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { uniqueSlug, slugify } from "@/lib/utils";
import { attributeSchemaSchema } from "@/lib/types";
import {
  categorySchema,
  failure,
  success,
  fieldErrorsOf,
  type ActionResult,
} from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

export async function saveCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireStaff();

  const id = String(formData.get("id") ?? "");
  const parsed = categorySchema.safeParse({
    ...Object.fromEntries(formData),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  // The attribute schema is what makes a category fit its product type.
  const rawSchema = formData.get("attributeSchema");
  let attributeSchema: unknown = [];
  if (typeof rawSchema === "string" && rawSchema) {
    try {
      const validated = attributeSchemaSchema.safeParse(JSON.parse(rawSchema));
      if (!validated.success) {
        return failure("One of the custom fields is invalid. Check its name and type.");
      }
      // Keys are used as JSON paths in queries — normalise them.
      attributeSchema = validated.data.map((field) => ({
        ...field,
        key: slugify(field.key).replace(/-/g, "_") || field.key,
      }));
    } catch {
      return failure("Couldn't read the custom fields.");
    }
  }

  const slug = input.slug
    ? input.slug
    : await uniqueSlug(input.name, async (candidate) =>
        Boolean(
          await prisma.category.findFirst({
            where: { slug: candidate, ...(id ? { id: { not: id } } : {}) },
            select: { id: true },
          }),
        ),
      );

  const data = {
    name: input.name,
    slug,
    description: input.description || null,
    imageUrl: input.imageUrl || null,
    // Guard against a category becoming its own parent.
    parentId: input.parentId && input.parentId !== id ? input.parentId : null,
    sortOrder: input.sortOrder,
    active: input.active,
    attributeSchema: attributeSchema as Prisma.InputJsonValue,
  };

  let createdId: string | null = null;

  try {
    if (id) {
      await prisma.category.update({ where: { id }, data });
    } else {
      const created = await prisma.category.create({ data });
      createdId = created.id;
    }
  } catch (error) {
    console.error("Category save failed:", error);
    return failure("Couldn't save the category — is that slug already taken?");
  }

  revalidatePath("/", "layout");

  // `redirect` throws a control-flow exception, so it must stay outside the
  // try/catch above — otherwise a successful save is reported as a failure.
  if (createdId) redirect(`/admin/categories/${createdId}`);

  return success(undefined, "Category saved.");
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireStaff();

  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return failure(
      `That category still has ${count} product${count === 1 ? "" : "s"}. Move them first.`,
    );
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  return success(undefined, "Category deleted.");
}
