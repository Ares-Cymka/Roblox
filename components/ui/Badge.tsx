import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "neutral" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-brand-success",
  warning: "bg-red-100 text-brand-warning",
  neutral: "bg-gray-100 text-gray-600",
  info: "bg-blue-100 text-brand-secondary",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusToBadgeVariant(
  status: string
): BadgeVariant {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "warning";
    case "PROCESSING":
      return "info";
    default:
      return "neutral";
  }
}
