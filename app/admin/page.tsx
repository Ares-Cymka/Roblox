import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { AdminActions } from "@/components/admin/AdminActions";
import { validateAdminSession } from "@/server/services/delivery";
import { getDeliveryStats, listDeliveries } from "@/server/services/delivery";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;

  if (!sessionToken || !(await validateAdminSession(sessionToken))) {
    redirect("/admin/login");
  }

  const [stats, deliveries] = await Promise.all([
    getDeliveryStats(),
    listDeliveries(),
  ]);

  const statCards = [
    { label: "Total", value: stats.total, variant: "neutral" as const },
    { label: "Pending", value: stats.pending, variant: "neutral" as const },
    { label: "Processing", value: stats.processing, variant: "info" as const },
    { label: "Completed", value: stats.completed, variant: "success" as const },
    { label: "Failed", value: stats.failed, variant: "warning" as const },
  ];

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor deliveries and queue health.
            </p>
          </div>
          <AdminActions />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((stat) => (
            <Card key={stat.label} className="text-center">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              <Badge variant={stat.variant} className="mt-2">
                {stat.label}
              </Badge>
            </Card>
          ))}
        </div>

        <Card title="Recent Deliveries" description="Latest delivery records">
          {deliveries.length === 0 ? (
            <p className="text-sm text-gray-500">No deliveries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Product</th>
                    <th className="pb-2 pr-4 font-medium">Claim Code</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50">
                      <td className="py-3 pr-4">{d.productName}</td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {d.claimCode}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusToBadgeVariant(d.status)}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-500">
                        {formatDate(d.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
