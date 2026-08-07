"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  isStaff,
} from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart";
import {
  loginSchema,
  signupSchema,
  failure,
  fieldErrorsOf,
  type ActionResult,
} from "@/lib/validation";

/** Only allow same-site relative paths, so `?next=` can't become an open redirect. */
function safeRedirect(target: string | null, fallback: string) {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}

export async function login(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Same message either way: don't reveal which emails have accounts.
  const invalid = failure("Incorrect email or password.");
  if (!user) {
    // Constant-ish work so a missing user isn't detectably faster.
    await hashPassword(password);
    return invalid;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;

  await createSession({ userId: user.id, role: user.role });

  // Carry an anonymous cart over to the account.
  const cart = await getOrCreateCart();
  if (!cart.userId) {
    await prisma.cart.update({ where: { id: cart.id }, data: { userId: user.id } });
  }

  revalidatePath("/", "layout");

  const requested = formData.get("next");
  const fallback = isStaff(user.role) ? "/admin" : "/account/orders";
  redirect(safeRedirect(typeof requested === "string" ? requested : null, fallback));
}

export async function signup(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return failure("Please check the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { name, email, password } = parsed.data;
  const normalized = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    return failure("An account with that email already exists.", {
      email: "Already registered — try signing in instead.",
    });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: normalized,
      passwordHash: await hashPassword(password),
      role: "CUSTOMER",
    },
  });

  await createSession({ userId: user.id, role: user.role });

  const cart = await getOrCreateCart();
  if (!cart.userId) {
    await prisma.cart.update({ where: { id: cart.id }, data: { userId: user.id } });
  }

  revalidatePath("/", "layout");
  redirect("/account/orders");
}

export async function logout() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}
