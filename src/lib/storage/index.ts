import "server-only";

/**
 * Uploads go through one interface with two drivers, chosen by STORAGE_DRIVER:
 *   local -> ./data/uploads, served back by /api/uploads/[...path]
 *   s3    -> any S3-compatible bucket (Cloudflare R2, Backblaze, MinIO, AWS)
 *
 * Railway's container disk is ephemeral, so deployments there should set
 * STORAGE_DRIVER=s3 (or attach a volume at ./data).
 */

export type PutResult = {
  key: string;
  url: string;
};

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<PutResult>;
  delete(key: string): Promise<void>;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
] as const;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/** Date-partitioned, random key. Never derived from the user's filename. */
export function buildKey(contentType: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ext = extensions[contentType] ?? "bin";
  return `${year}/${month}/${crypto.randomUUID()}.${ext}`;
}

export function storageDriverName() {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

export async function getStorage(): Promise<StorageDriver> {
  if (storageDriverName() === "s3") {
    const { s3Driver } = await import("./s3");
    return s3Driver();
  }
  const { localDriver } = await import("./local");
  return localDriver();
}
