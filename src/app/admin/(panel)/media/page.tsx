import Image from "next/image";
import { Images } from "lucide-react";
import { prisma } from "@/lib/db";
import { storageDriverName } from "@/lib/storage";
import { PageHeader } from "@/components/admin/page-header";
import { RowActions } from "@/components/admin/row-actions";
import { Badge, EmptyState } from "@/components/ui";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AdminMediaPage() {
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  const driver = storageDriverName();
  const totalBytes = assets.reduce((sum, a) => sum + a.sizeBytes, 0);

  return (
    <>
      <PageHeader
        title="Media"
        description={`${assets.length} file${assets.length === 1 ? "" : "s"} · ${formatBytes(totalBytes)}`}
        actions={
          <Badge tone={driver === "s3" ? "success" : "neutral"}>
            {driver === "s3" ? "S3 / R2 bucket" : "Local disk (./data/uploads)"}
          </Badge>
        }
      />

      {driver === "local" && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Local storage needs a persistent volume. On Railway, set{" "}
          <code className="font-mono">STORAGE_DRIVER=s3</code> or files will be lost
          on the next deploy.
        </p>
      )}

      {assets.length === 0 ? (
        <EmptyState
          icon={<Images className="size-8" />}
          title="No uploads yet"
          description="Images uploaded from product and settings forms collect here."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-xl border border-line">
              <div className="relative aspect-square bg-surface">
                <Image
                  src={asset.url}
                  alt={asset.alt ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center gap-1 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted" title={asset.key}>
                    {asset.key.split("/").pop()}
                  </p>
                  <p className="text-xs text-muted">{formatBytes(asset.sizeBytes)}</p>
                </div>
                <RowActions id={asset.id} kind="media" />
              </div>
            </div>
          ))}
        </div>
      )}

      {assets.length > 0 && (
        <p className="mt-6 text-xs text-muted">
          Deleting a file here removes it from storage. Any product still
          referencing it will show a broken image, so check before deleting.
        </p>
      )}
    </>
  );
}
