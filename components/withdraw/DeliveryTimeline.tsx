import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

interface DeliveryTimelineProps {
  logs: LogEntry[];
}

const customerMessages: Record<string, string> = {
  "Inventory withdrawal created": "Withdrawal created",
  "Roblox username confirmed": "Username confirmed",
  "Delivery bot assigned": "Delivery bot assigned",
  "Friend request marked as sent": "Friend request sent",
  "Customer joined server": "Joined server",
  "Delivery queued": "Delivery queued",
  "Delivery completed": "Delivery completed",
};

function filterCustomerLog(message: string): boolean {
  const hidden = [
    "RETRYING",
    "worker",
    "queue payload",
    "BullMQ",
    "prisma",
    "stack",
    "connection",
    "mutex",
    "lock",
  ];
  return !hidden.some((h) => message.toLowerCase().includes(h.toLowerCase()));
}

function friendlyMessage(raw: string): string {
  for (const [key, val] of Object.entries(customerMessages)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return val;
  }
  if (raw.toLowerCase().includes("bot") && raw.toLowerCase().includes("assign")) return "Bot assigned";
  if (raw.toLowerCase().includes("friend")) return "Friend request action";
  if (raw.toLowerCase().includes("reassign")) return "Bot reassigned";
  if (raw.toLowerCase().includes("expire")) return "Session expired";
  if (raw.toLowerCase().includes("support")) return "Sent to support review";
  if (raw.toLowerCase().includes("approved")) return "Approved by support";
  if (raw.toLowerCase().includes("rejected") || raw.toLowerCase().includes("reject")) return "Rejected by support";
  if (raw.toLowerCase().includes("proof")) return "Delivery proof recorded";
  if (raw.toLowerCase().includes("fail") || raw.toLowerCase().includes("error")) return "Delivery issue noted";
  if (raw.toLowerCase().includes("retry")) return "Delivery rescheduled";
  if (raw.toLowerCase().includes("delivered") || raw.toLowerCase().includes("complete")) return "Delivery completed";
  return raw.length > 80 ? raw.slice(0, 77) + "…" : raw;
}

export function DeliveryTimeline({ logs }: DeliveryTimelineProps) {
  const visible = logs.filter((l) => filterCustomerLog(l.message));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-rbx-dim">No delivery events yet.</p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {visible.map((log, index) => {
        const isLast = index === visible.length - 1;
        const isError = log.level === "ERROR";
        const isWarn = log.level === "WARN";

        return (
          <li key={log.id} className="flex gap-3 pb-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "timeline-dot mt-0.5",
                  isError
                    ? "bg-rbx-red"
                    : isWarn
                      ? "bg-rbx-yellow"
                      : isLast
                        ? "bg-rbx-blue ring-4 ring-rbx-blue/20"
                        : "bg-rbx-green"
                )}
              />
              {!isLast && <div className="mt-1 w-0.5 flex-1 bg-rbx-border" style={{ minHeight: "16px" }} />}
            </div>
            <div className="flex-1 pb-1">
              <p
                className={cn(
                  "text-sm font-semibold leading-tight",
                  isError ? "text-rbx-red" : isLast ? "text-rbx-text" : "text-rbx-muted"
                )}
              >
                {friendlyMessage(log.message)}
              </p>
              <p className="mt-0.5 text-xs text-rbx-dim">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
