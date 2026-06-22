import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "neutral" | "info" | "pending" | "danger";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "border-rbx-green/30 bg-rbx-green/10 text-rbx-green",
  warning: "border-rbx-yellow/40 bg-rbx-yellow/10 text-rbx-yellow",
  danger: "border-rbx-red/30 bg-rbx-red/10 text-rbx-red",
  neutral: "border-rbx-border bg-rbx-elevated text-rbx-muted",
  info: "border-rbx-blue/30 bg-rbx-blue/10 text-rbx-blue",
  pending: "border-rbx-yellow/30 bg-rbx-yellow/8 text-rbx-yellow",
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
    case "PAID":
    case "INVENTORY_CREDITED":
      return "success";
    case "FAILED":
    case "CANCELLED":
      return "danger";
    case "EXPIRED":
    case "SUPPORT_REQUIRED":
      return "warning";
    case "PROCESSING":
    case "RETRYING":
      return "info";
    case "QUEUED":
    case "WAITING_USER":
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

/** Returns a human-readable label for a withdrawal/delivery status */
export function statusToLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pending",
    USERNAME_REQUIRED: "Username Needed",
    QUEUED: "Queued",
    WAITING_FRIEND_REQUEST: "Add Bot Friend",
    WAITING_JOIN: "Join Server",
    WAITING_USER: "Waiting",
    PROCESSING: "Processing",
    DELIVERED: "Delivered",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    SUPPORT_REQUIRED: "Support Review",
    EXPIRED: "Expired",
    RETRYING: "Retrying",
    PAID: "Paid",
    INVENTORY_CREDITED: "Inventory Credited",
    FRIEND_REQUEST_PENDING: "Friend Req. Pending",
    ASSIGNED: "Assigned",
    COMPLETED: "Completed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
