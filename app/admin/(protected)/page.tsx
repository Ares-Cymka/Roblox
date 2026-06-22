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
    { label: "Active Bots", value: stats.activeBots, variant: "success" as const },
    { label: "Pending Deliveries", value: stats.pendingDeliveries, variant: "info" as const },
    { label: "Failed Deliveries", value: stats.failedDeliveries, variant: "warning" as const },
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
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className="font-semibold text-rbx-blue hover:underline"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
