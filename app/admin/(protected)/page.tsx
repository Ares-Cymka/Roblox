import Link from "next/link";
import { getAdminDashboardStats } from "@/server/services/admin-dashboard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const ADAPTER_LABELS: Record<string, { label: string; variant: "info" | "success" | "warning" }> = {
  manual: { label: "Manual (admin confirms)", variant: "info" },
  mock: { label: "Mock (auto-simulated)", variant: "warning" },
  auto: { label: "Auto (game adapters)", variant: "success" },
};

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();
  const adapterEnv = (process.env.DELIVERY_ADAPTER ?? "manual").trim();
  const adapterInfo = ADAPTER_LABELS[adapterEnv] ?? { label: adapterEnv, variant: "warning" as const };

  const statCards = [
    { label: "Total Products", value: stats.totalProducts, variant: "neutral" as const },
    { label: "Total Orders", value: stats.totalOrders, variant: "neutral" as const },
    { label: "Total Claims", value: stats.totalClaims, variant: "info" as const },
    { label: "Active Queue", value: stats.pendingDeliveries, variant: "info" as const },
    { label: "Processing", value: stats.processingDeliveries, variant: "info" as const },
    { label: "Failed Deliveries", value: stats.failedDeliveries, variant: "warning" as const },
    { label: "Support Required", value: stats.supportRequired, variant: "warning" as const },
    { label: "Online Bots", value: stats.onlineBots, variant: "success" as const },
    { label: "Offline / Disabled", value: stats.offlineBots, variant: "neutral" as const },
    { label: "Avg Wait (min)", value: stats.avgDeliveryMinutes, variant: "neutral" as const },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Overview of catalog, orders, bots, and delivery health."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((stat) => (
          <AdminStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            variant={stat.variant}
          />
        ))}
      </div>

      {/* Bot Controller Status */}
      <Card title="Bot Controller" elevated>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rbx-muted mb-1">Delivery Mode</p>
            <Badge variant={adapterInfo.variant}>{adapterInfo.label}</Badge>
          </div>
          <div className="flex-1 text-rbx-muted">
            {adapterEnv === "manual" && (
              <p>
                Deliveries stay in <strong>PROCESSING</strong> until an admin clicks{" "}
                <strong>Mark Delivered</strong> on the delivery detail page.
                Bot accounts must be operated manually by your team.
              </p>
            )}
            {adapterEnv === "mock" && (
              <p>
                Deliveries are <strong>auto-completed after a short delay</strong> for testing.
                No real Roblox interaction occurs. Switch to <code>manual</code> for production.
              </p>
            )}
            {adapterEnv === "auto" && (
              <p>
                Game-specific adapters are <strong>placeholders</strong> until the client confirms
                the automation approach. Jobs that fail auto-delivery fall back to manual confirmation.
              </p>
            )}
          </div>
          {adapterEnv === "mock" || adapterEnv === "auto" ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rbx-muted mb-1">Worker</p>
              <p className="text-xs text-rbx-muted font-mono">npx tsx scripts/bot-worker.ts</p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card
        title="Quick links"
        description="Jump to common admin sections."
        elevated
      >
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["/admin/products", "Manage product catalog"],
            ["/admin/orders", "Review orders"],
            ["/admin/bots", "Monitor delivery bots"],
            ["/admin/deliveries", "Track delivery jobs"],
            ["/admin/support", "Support review queue"],
            ["/admin/withdrawals", "Withdrawals"],
          ].map(([href, label]) => (
            <li key={href}>
              <Link href={href!} className="font-semibold text-rbx-blue hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
