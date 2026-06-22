"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/inventory", label: "Inventory" },
  { href: "/claim", label: "Claim" },
  { href: "/store", label: "Store" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-rbx-border bg-rbx-surface/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo subtitle="Delivery" />

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rbx-nav-link",
                  active && "rbx-nav-link-active"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/admin/login"
            className="ml-2 rounded-rbx border border-rbx-border px-3 py-1.5 text-sm font-semibold text-rbx-muted transition-colors hover:border-rbx-blue hover:text-rbx-blue"
          >
            Admin ↗
          </Link>
        </nav>
      </div>
    </header>
  );
}
