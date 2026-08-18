"use server";

import { headers } from "next/headers"; // CHANGED: needed for IP-based rate limiting
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

// CHANGED: server-side brute-force protection.
// These counters are stored server-side, not in the browser.
import {
  checkLoginRateLimit,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/login-rate-limit";

/** Only allow same-site relative paths, so `?next=` can't become an open redirect. */
function safeRedirect(target: string | null, fallback: string) {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }

  return target;
}

export async function login(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return failure(
      "Please check the highlighted fields.",
      fieldErrorsOf(parsed.error),
    );
  }

  const { email, password } = parsed.data;

  // CHANGED: Normalize email once so rate-limit keys and database
  // lookups always use the same value.
  const normalizedEmail = email.toLowerCase();

  // CHANGED:
  // Detect whether this login came from /admin/login.
  //
  // The hidden input is NOT the security boundary. The actual
  // STAFF/ADMIN check happens on the server below.
  const isAdminLogin = formData.get("admin") === "true";

  // CHANGED:
  // Get the client IP for IP-based brute-force protection.
  const requestHeaders = await headers();

  const forwardedFor = requestHeaders.get("x-forwarded-for");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";

  // CHANGED:
  // Use two separate rate-limit keys:
  //
  // account:<email> → protects one account from password guessing.
  // ip:<address>    → prevents attacking many accounts from one IP.
  const accountKey = `account:${normalizedEmail}`;
  const ipKey = `ip:${ip}`;

  // CHANGED:
  // Check the limits BEFORE performing bcrypt verification because
  // bcrypt is intentionally expensive.
  const [accountLimit, ipLimit] = await Promise.all([
    checkLoginRateLimit(accountKey),
    checkLoginRateLimit(ipKey),
  ]);

  if (!accountLimit.allowed || !ipLimit.allowed) {
    return failure(
      "Too many login attempts. Please try again later.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Same response for nonexistent users and wrong passwords.
  // This prevents account/email enumeration.
  const invalid = failure("Incorrect email or password.");

  if (!user) {
    // Keep roughly similar password-hashing work even when
    // the email doesn't exist.
    await hashPassword(password);

    // CHANGED:
    // Count nonexistent-email attempts too.
    await Promise.all([
      recordLoginFailure(accountKey),
      recordLoginFailure(ipKey),
    ]);

    return invalid;
  }

  // CHANGED:
  // Verify the password server-side.
  const passwordValid = await verifyPassword(
    password,
    user.passwordHash,
  );

  if (!passwordValid) {
    // CHANGED:
    // Wrong password → count against both the account and IP.
    await Promise.all([
      recordLoginFailure(accountKey),
      recordLoginFailure(ipKey),
    ]);

    return invalid;
  }

  // CHANGED:
  // Password is correct, BUT we still need to make sure a CUSTOMER
  // isn't using the admin login endpoint.
  //
  // IMPORTANT: This check happens BEFORE clearing the failed-attempt
  // counters. A CUSTOMER attempting /admin/login is treated as
  // an invalid login attempt.
  if (isAdminLogin && !isStaff(user.role)) {
    await Promise.all([
      recordLoginFailure(accountKey),
      recordLoginFailure(ipKey),
    ]);

    return invalid;
  }

  // CHANGED:
  // All authentication checks passed.
  // Now clear previous failed login attempts.
  await Promise.all([
    clearLoginFailures(accountKey),
    clearLoginFailures(ipKey),
  ]);

  await createSession({
    userId: user.id,
    role: user.role,
  });

  // Carry an anonymous cart over to the account.
  const cart = await getOrCreateCart();

  if (!cart.userId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { userId: user.id },
    });
  }

  revalidatePath("/", "layout");

  const requested = formData.get("next");

  const fallback = isStaff(user.role)
    ? "/admin"
    : "/account/orders";

  redirect(
    safeRedirect(
      typeof requested === "string" ? requested : null,
      fallback,
    ),
  );
}

export async function signup(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return failure(
      "Please check the highlighted fields.",
      fieldErrorsOf(parsed.error),
    );
  }

  const { name, email, password } = parsed.data;
  const normalized = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalized },
  });

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

  await createSession({
    userId: user.id,
    role: user.role,
  });

  const cart = await getOrCreateCart();

  if (!cart.userId) {
    await prisma.cart.update({
      where: { id: cart.id },
      data: { userId: user.id },
    });
  }

  revalidatePath("/", "layout");
  redirect("/account/orders");
}

export async function logout() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}