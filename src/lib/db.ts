import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 removed the Rust query engine, so a driver adapter is required.
const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

// Dev HMR would otherwise open a new pool on every reload until Postgres
// refuses connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
