"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/bots", label: "Bots" },
  { href: "/admin/deliveries", label: "Deliveries" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <Link href="/admin" className="text-lg font-bold text-gray-900">
          RngBlox Admin
        </Link>
        <p className="mt-1 text-xs text-gray-500">Delivery control panel</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-secondary text-white"
                  : "text-gray-600 hover:bg-brand-bg hover:text-gray-900"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <AdminLogoutButton className="w-full" />
      </div>
    </aside>
  );
}
