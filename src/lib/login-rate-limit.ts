import { prisma } from "@/lib/db";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export async function checkLoginRateLimit(key: string) {
  const record = await prisma.loginAttempt.findUnique({
    where: { key },
  });

  if (!record) {
    return { allowed: true };
  }

  if (record.blockedUntil && record.blockedUntil > new Date()) {
    return {
      allowed: false,
      retryAfter: Math.ceil(
        (record.blockedUntil.getTime() - Date.now()) / 1000,
      ),
    };
  }

  return { allowed: true };
}

export async function recordLoginFailure(key: string) {
  const now = new Date();

  const record = await prisma.loginAttempt.upsert({
    where: { key },
    create: {
      key,
      attempts: 1,
    },
    update: {
      attempts: {
        increment: 1,
      },
      updatedAt: now,
    },
  });

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.loginAttempt.update({
      where: { key },
      data: {
        attempts: 0,
        blockedUntil: new Date(Date.now() + LOCKOUT_MS),
      },
    });
  }
}

export async function clearLoginFailures(key: string) {
  await prisma.loginAttempt.deleteMany({
    where: { key },
  });
}