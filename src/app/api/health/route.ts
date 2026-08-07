import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Container healthcheck: verifies the process *and* its database connection. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error", database: false }, { status: 503 });
  }
}
