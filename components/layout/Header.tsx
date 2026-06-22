"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/inventory", label: "Inventory" },
  { href: "/claim", label: "Claim" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-rbx-border bg-rbx-surface/95 backdrop-blur-md">
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
                  active && "rbx-nav-link-active text-rbx-blue"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/admin/login"
            className="ml-2 rounded-rbx bg-rbx-elevated px-4 py-2 text-sm font-bold text-rbx-muted transition-colors hover:bg-rbx-border hover:text-rbx-text"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
