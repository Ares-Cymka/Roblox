import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DeliveryJobActions } from "@/components/admin/deliveries/DeliveryJobActions";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { listDeliveryJobs } from "@/server/services/admin-delivery";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDeliveriesPage() {
  const deliveries = await listDeliveryJobs();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Deliveries"
        description="Manual operator queue for withdrawal delivery jobs."
      />

      <Card
        title="Delivery jobs"
        description={`${deliveries.length} job(s) in the system`}
        elevated
      >
        {deliveries.length === 0 ? (
          <p className="text-sm text-rbx-muted">No delivery jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rbx-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Withdrawal</th>
                  <th>Customer</th>
                  <th>Game</th>
                  <th>Method</th>
                  <th>Bot</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((job) => (
                  <tr key={job.id}>
                    <td className="font-mono text-xs text-rbx-text">
                      <Link
                        href={`/admin/deliveries/${job.id}`}
                        className="text-rbx-blue hover:underline"
                      >
                        {job.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="font-mono font-semibold text-rbx-text">
                      {job.withdrawalCode ?? job.claimCode ?? "—"}
                    </td>
                    <td>{job.customerRobloxUsername ?? "—"}</td>
                    <td>{job.game ?? "—"}</td>
                    <td>
                      {job.deliveryMethod
                        ? job.deliveryMethod.replace(/_/g, " ")
                        : "—"}
                    </td>
                    <td>{job.assignedBotUsername ?? "—"}</td>
                    <td className="max-w-[220px] text-sm text-rbx-muted">
                      {job.items
                        .map((item) => `${item.name} x${item.quantity}`)
                        .join(", ")}
                    </td>
                    <td>
                      <Badge variant={statusToBadgeVariant(job.status)}>
                        {job.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td>{job.attempts}</td>
                    <td>{formatDate(job.createdAt)}</td>
                    <td className="min-w-[280px]">
                      <DeliveryJobActions
                        deliveryJobId={job.id}
                        status={job.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
