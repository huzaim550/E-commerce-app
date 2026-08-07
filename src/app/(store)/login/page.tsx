import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getSession()) redirect("/account/orders");

  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div className="container-store py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Sign in</h1>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
