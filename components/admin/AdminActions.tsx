"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AdminActions() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <Button variant="secondary" onClick={handleLogout}>
      Log Out
    </Button>
  );
}
