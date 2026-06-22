"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AdminLogoutButtonProps {
  className?: string;
}

export function AdminLogoutButton({ className }: AdminLogoutButtonProps) {
  return (
    <form action="/api/admin/logout" method="POST" className={cn(className)}>
      <Button type="submit" variant="secondary" className="w-full">
        Log Out
      </Button>
    </form>
  );
}
