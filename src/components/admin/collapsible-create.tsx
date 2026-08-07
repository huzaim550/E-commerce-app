"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button, Card } from "@/components/ui";

/** "New X" button that reveals an inline create form. */
export function CollapsibleCreate({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {label}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{label}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
        >
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </Card>
  );
}
