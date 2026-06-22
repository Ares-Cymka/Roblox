"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⊞", exact: true },
  { href: "/admin/products", label: "Products", icon: "📦" },
  { href: "/admin/orders", label: "Orders", icon: "🛒" },
  { href: "/admin/claims", label: "Claims", icon: "🎁" },
  { href: "/admin/customer-inventory", label: "Inventory", icon: "🗃" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "↑" },
  { href: "/admin/bots", label: "Bots", icon: "🤖" },
  { href: "/admin/game-configs", label: "Game Configs", icon: "⚙" },
  { href: "/admin/deliveries", label: "Deliveries", icon: "🚚" },
  { href: "/admin/support", label: "Support Review", icon: "🔍" },
  { href: "/admin/logs", label: "Logs", icon: "📋" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-rbx-border bg-rbx-surface">
      <div className="border-b border-rbx-border px-4 py-4">
        <Logo subtitle="Admin" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-rbx px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-rbx-blue/10 text-rbx-blue"
                  : "text-rbx-muted hover:bg-rbx-elevated hover:text-rbx-text"
              )}
            >
              <span className="w-4 text-center text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-rbx-border p-3">
        <AdminLogoutButton className="w-full" />
      </div>
    </aside>
  );
}
