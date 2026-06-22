import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdminSession();

  return <AdminShell>{children}</AdminShell>;
}
