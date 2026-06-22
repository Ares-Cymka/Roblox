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
    <Card className="text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <Badge variant={variant} className="mt-3">
        {label}
      </Badge>
    </Card>
  );
}
