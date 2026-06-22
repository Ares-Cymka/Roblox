import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "pending";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-rbx-green text-white shadow-rbx-green hover:bg-rbx-green-hover active:translate-y-0.5 active:shadow-none",
  secondary:
    "bg-rbx-blue text-white shadow-rbx-blue hover:bg-rbx-blue-hover active:translate-y-0.5 active:shadow-none",
  danger:
    "bg-rbx-red text-white shadow-rbx-red hover:bg-rbx-red-hover active:translate-y-0.5 active:shadow-none",
  pending:
    "bg-rbx-yellow text-gray-900 shadow-[0_4px_0_0_#c9a820] hover:bg-rbx-yellow-hover active:translate-y-0.5 active:shadow-none",
  ghost:
    "bg-transparent text-rbx-muted hover:bg-rbx-elevated hover:text-rbx-text shadow-none",
  outline:
    "border-2 border-rbx-border bg-rbx-elevated text-rbx-text hover:border-rbx-muted hover:bg-rbx-surface shadow-none",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-rbx font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:translate-y-0",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
