import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";

interface PageShellProps {
  children: ReactNode;
  narrow?: boolean;
}

export function PageShell({ children, narrow = false }: PageShellProps) {
  return (
    <div className="min-h-screen bg-rbx-bg">
      <Header />
      <main
        className={
          narrow
            ? "mx-auto max-w-lg px-4 py-8"
            : "mx-auto max-w-6xl px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
