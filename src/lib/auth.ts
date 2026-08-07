import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

const COOKIE = "store_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
  role: Role;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Verified session claims, or null. Does not hit the database. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { userId: payload.userId, role: payload.role as Role };
  } catch {
    // Expired or tampered — treat as signed out.
    return null;
  }
});

/** The signed-in user, re-read from the database so role changes take effect. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, phone: true },
  });
});

export function isStaff(role: Role | undefined | null) {
  return role === "ADMIN" || role === "STAFF";
}

/**
 * Guard for every admin page and every admin Server Action. Server Actions are
 * reachable by direct POST, so checking only in the layout is not enough.
 */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) redirect("/admin/login");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return user;
}

export async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
