import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { resolveUploadPath } from "@/lib/storage/local";

/** Serves files written by the `local` storage driver. */

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
};

export async function GET(_request: Request, ctx: RouteContext<"/api/uploads/[...path]">) {
  const { path: segments } = await ctx.params;
  const key = segments.join("/");

  // Rejects any key that resolves outside the upload root.
  const filePath = resolveUploadPath(key);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return new NextResponse("Not found", { status: 404 });

  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentTypes[ext] ?? "application/octet-stream",
      "Content-Length": String(info.size),
      // Keys are random and never reused, so these are safe to cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
