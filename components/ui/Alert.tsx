import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AlertProps {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  className?: string;
}

const variantStyles = {
  info: "border-rbx-blue/30 bg-rbx-blue/8 text-rbx-blue",
  success: "border-rbx-green/30 bg-rbx-green/8 text-rbx-green",
  warning: "border-rbx-yellow/40 bg-rbx-yellow/8 text-rbx-yellow",
  error: "border-rbx-red/30 bg-rbx-red/8 text-rbx-red",
};

const icons = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
};

export function Alert({ children, variant = "error", className }: AlertProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-rbx border px-4 py-3 text-sm font-medium leading-relaxed",
        variantStyles[variant],
        className
      )}
    >
      <span className="mt-0.5 flex-shrink-0 text-base leading-none">{icons[variant]}</span>
      <span>{children}</span>
    </div>
  );
}
