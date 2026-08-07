import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small shared primitives. Deliberately plain — no component library. */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

const buttonVariants = {
  primary: "bg-primary text-primary-fg hover:opacity-90",
  accent: "bg-accent text-accent-fg hover:opacity-90",
  outline: "border border-line bg-bg hover:bg-surface text-fg",
  ghost: "hover:bg-surface text-fg",
  danger: "bg-red-600 text-white hover:bg-red-700",
  subtle: "bg-surface text-fg hover:bg-line/60",
} as const;

const buttonSizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-base",
  icon: "h-9 w-9",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export const inputClass =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-bg p-5", className)}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-surface text-muted border-line",
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  } as const;

  return (
    <div className={cn("rounded-lg border px-3 py-2 text-sm", tones[tone])} role="status">
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface", className)} />;
}
