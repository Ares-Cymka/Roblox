import { Card } from "@/components/ui/Card";

interface AdminPlaceholderProps {
  title: string;
  description: string;
}

export function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <Card title={title} description={description}>
      <p className="text-sm text-gray-500">
        This section will be available in a future step.
      </p>
    </Card>
  );
}
