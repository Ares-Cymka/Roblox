import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface DeliveryLogEntry {
  id: string;
  level: string;
  message: string;
  createdAt: string | Date;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

interface DeliveryLogsCardProps {
  logs: DeliveryLogEntry[];
}

export function DeliveryLogsCard({ logs }: DeliveryLogsCardProps) {
  if (logs.length === 0) return null;

  return (
    <Card title="Delivery Logs" description="Recent delivery activity." elevated>
      <ul className="space-y-3">
        {logs.map((log) => (
          <li
            key={log.id}
            className="rounded-rbx border border-rbx-border bg-rbx-panel px-4 py-3"
          >
            <p className="text-sm text-rbx-text">{log.message}</p>
            <p className="mt-1 text-xs text-rbx-dim">{formatDate(toDate(log.createdAt))}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
