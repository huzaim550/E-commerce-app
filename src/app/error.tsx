"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-store flex flex-col items-center justify-center py-28 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        An unexpected error occurred. Trying again often works; if it doesn&apos;t,
        the server logs will have the details.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
