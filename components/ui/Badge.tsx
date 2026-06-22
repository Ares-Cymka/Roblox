import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "neutral" | "info" | "pending";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "border-rbx-green/50 bg-rbx-green/15 text-green-300",
  warning: "border-rbx-red/50 bg-rbx-red/15 text-red-300",
  neutral: "border-rbx-border bg-rbx-elevated text-rbx-muted",
  info: "border-rbx-blue/50 bg-rbx-blue/15 text-blue-200",
  pending: "border-rbx-yellow/50 bg-rbx-yellow/15 text-yellow-200",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusToBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "DELIVERED":
    case "COMPLETED":
      return "success";
    case "FAILED":
    case "CANCELLED":
    case "EXPIRED":
    case "SUPPORT_REQUIRED":
      return "warning";
    case "PROCESSING":
    case "WAITING_USER":
    case "RETRYING":
    case "QUEUED":
      return "info";
    case "WAITING_FRIEND_REQUEST":
    case "FRIEND_REQUEST_PENDING":
    case "PENDING":
    case "USERNAME_LINKED":
    case "USERNAME_REQUIRED":
      return "pending";
    default:
      return "neutral";
  }
}
