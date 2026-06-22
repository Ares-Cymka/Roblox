import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-rbx-bg">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
