import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="container-store py-8">
      <Skeleton className="h-4 w-56" />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />

        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
