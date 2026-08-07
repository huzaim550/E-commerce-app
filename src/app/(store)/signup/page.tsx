import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignupForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage() {
  if (await getSession()) redirect("/account/orders");

  return (
    <div className="container-store py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="mb-6 text-sm text-muted">
          Optional — you can also check out as a guest.
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
