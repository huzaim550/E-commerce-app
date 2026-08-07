"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { login, signup } from "@/app/actions/auth";
import { Button, Input, Field, Alert } from "@/components/ui";
import type { ActionResult } from "@/lib/validation";

export function LoginForm({
  next,
  admin = false,
}: {
  next?: string;
  admin?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    login,
    null,
  );
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}

      <Field label="Email" required error={errors.email} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>

      <Field label="Password" required error={errors.password} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Sign in
      </Button>

      {!admin && (
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      )}
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    signup,
    null,
  );
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}

      <Field label="Name" required error={errors.name} htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required autoFocus />
      </Field>

      <Field label="Email" required error={errors.email} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field
        label="Password"
        required
        hint="At least 8 characters."
        error={errors.password}
        htmlFor="password"
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Create account
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
