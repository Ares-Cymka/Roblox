"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/customer-inventory", label: "Inventory" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/bots", label: "Bots" },
  { href: "/admin/game-configs", label: "Game Configs" },
  { href: "/admin/deliveries", label: "Deliveries" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-rbx-border bg-rbx-surface">
      <div className="border-b border-rbx-border px-5 py-5">
        <Logo subtitle="Admin Panel" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-rbx px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-rbx-green/15 text-rbx-green"
                  : "text-rbx-muted hover:bg-rbx-elevated hover:text-rbx-text"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-rbx-border p-4">
        <AdminLogoutButton className="w-full" />
      </div>
    </aside>
  );
}
