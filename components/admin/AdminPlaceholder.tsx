import { Card } from "@/components/ui/Card";

interface AdminPlaceholderProps {
  title: string;
  description: string;
}

export function AdminPlaceholder({ title, description }: AdminPlaceholderProps) {
  return (
    <Card title={title} description={description} elevated>
      <p className="text-sm text-rbx-muted">This section is coming soon.</p>
    </Card>
  );
}
