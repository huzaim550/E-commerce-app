import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageDriver } from "./index";

let client: S3Client | null = null;

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`STORAGE_DRIVER=s3 but ${name} is not set.`);
  }
  return value;
}

function getClient() {
  if (client) return client;
  client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    // R2, MinIO and most non-AWS S3 services need path-style addressing.
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function s3Driver(): StorageDriver {
  const bucket = required("S3_BUCKET");
  const publicBase = (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "");

  return {
    async put(key, body, contentType) {
      await getClient().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      const url = publicBase
        ? `${publicBase}/${key}`
        : `${process.env.S3_ENDPOINT}/${bucket}/${key}`;
      return { key, url };
    },

    async delete(key) {
      await getClient()
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
        .catch(() => {
          // Best-effort: a missing object shouldn't block deleting its record.
        });
    },
  };
}
