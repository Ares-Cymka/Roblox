import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface AdminStatCardProps {
  label: string;
  value: number;
  variant?: "success" | "warning" | "neutral" | "info";
}

export function AdminStatCard({
  label,
  value,
  variant = "neutral",
}: AdminStatCardProps) {
  return (
    <Card elevated className="text-center">
      <p className="rbx-label">{label}</p>
      <p className="mt-3 text-4xl font-extrabold text-rbx-text">{value}</p>
      <Badge variant={variant} className="mt-4">
        {label}
      </Badge>
    </Card>
  );
}
