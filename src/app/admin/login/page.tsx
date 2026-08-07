import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LoginForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
  const user = await getCurrentUser();
  if (user && isStaff(user.role)) redirect("/admin");

  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/admin";
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-bg p-8">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold">{settings.storeName}</p>
          <p className="mt-1 text-sm text-muted">Admin panel</p>
        </div>

        <LoginForm next={next} admin />

        {user && !isStaff(user.role) && (
          <p className="mt-4 text-center text-xs text-muted">
            You&apos;re signed in as {user.email}, which isn&apos;t a staff account.
          </p>
        )}
      </div>
    </div>
  );
}
