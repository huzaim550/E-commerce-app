import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="container-store py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-24" />

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="mt-3 h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
