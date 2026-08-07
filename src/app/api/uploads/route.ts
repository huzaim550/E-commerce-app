import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  buildKey,
  getStorage,
} from "@/lib/storage";

/** Image upload endpoint for the admin panel. Staff only. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 415 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = buildKey(file.type);

  try {
    const storage = await getStorage();
    const { url } = await storage.put(key, buffer, file.type);

    const asset = await prisma.mediaAsset.create({
      data: { key, url, mime: file.type, sizeBytes: file.size },
    });

    return NextResponse.json({ id: asset.id, url: asset.url, key: asset.key });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
