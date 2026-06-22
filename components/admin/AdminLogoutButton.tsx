"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AdminLogoutButtonProps {
  className?: string;
}

export function AdminLogoutButton({ className }: AdminLogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      onClick={handleLogout}
      className={cn(className)}
    >
      Log Out
    </Button>
  );
}
