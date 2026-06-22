import Link from "next/link";
import { getAdminDashboardStats } from "@/server/services/admin-dashboard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

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
