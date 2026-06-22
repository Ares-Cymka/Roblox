import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  children: ReactNode;
  variant?: "warning" | "info" | "success";
  className?: string;
}

export function Alert({ children, variant = "warning", className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-rbx border-2 px-4 py-3 text-sm font-semibold",
        variant === "warning" &&
          "border-rbx-red/40 bg-rbx-red/10 text-red-300",
        variant === "info" &&
          "border-rbx-blue/40 bg-rbx-blue/10 text-blue-200",
        variant === "success" &&
          "border-rbx-green/40 bg-rbx-green/10 text-green-300",
        className
      )}
    >
      {children}
    </div>
  );
}
