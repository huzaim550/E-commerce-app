import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver } from "./index";

export const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

/**
 * Rejects keys that would escape UPLOAD_ROOT. Applied on both write and read
 * (the /api/uploads route) so a crafted path can't reach the filesystem.
 */
export function resolveUploadPath(key: string): string | null {
  if (!key || key.includes("\0")) return null;
  const target = path.resolve(UPLOAD_ROOT, key);
  const root = path.resolve(UPLOAD_ROOT);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

export function localDriver(): StorageDriver {
  return {
    async put(key, body) {
      const target = resolveUploadPath(key);
      if (!target) throw new Error("Invalid storage key");
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
      return { key, url: `/api/uploads/${key}` };
    },

    async delete(key) {
      const target = resolveUploadPath(key);
      if (!target) return;
      await unlink(target).catch(() => {
        // Already gone — deleting an asset record shouldn't fail on this.
      });
    },
  };
}
