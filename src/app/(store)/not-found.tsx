import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container-store flex flex-col items-center justify-center py-28 text-center">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        That page doesn&apos;t exist, or the product may have been removed.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/products" variant="outline">
          Browse products
        </ButtonLink>
      </div>
    </div>
  );
}
