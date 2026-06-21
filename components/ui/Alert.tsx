import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  children: ReactNode;
  variant?: "warning" | "info";
  className?: string;
}

export function Alert({ children, variant = "warning", className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "warning" &&
          "border-red-200 bg-red-50 text-brand-warning",
        variant === "info" &&
          "border-blue-200 bg-blue-50 text-brand-secondary",
        className
      )}
    >
      {children}
    </div>
  );
}
