import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listSupportWithdrawals } from "@/server/services/support-review";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const withdrawals = await listSupportWithdrawals();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Support Review Queue"
        description="High-value withdrawals requiring manual review before delivery."
      />

      <Card
        title="Pending Reviews"
        description={`${withdrawals.length} withdrawal(s) require review`}
        elevated
      >
        {withdrawals.length === 0 ? (
          <p className="text-sm text-rbx-muted">
            No withdrawals pending support review.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rbx-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Roblox Username</th>
                  <th>Game</th>
                  <th>Total Value</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Support Reason</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="font-mono font-semibold text-rbx-text">
                      {w.withdrawalCode}
                    </td>
                    <td className="text-xs text-rbx-muted">
                      {w.customer?.email ?? w.sessionId ?? "—"}
                    </td>
                    <td>{w.robloxUsername ?? "—"}</td>
                    <td>{w.game ?? "—"}</td>
                    <td className="font-semibold text-rbx-yellow">
                      ${w.totalValue.toFixed(2)}
                    </td>
                    <td>{w.items.length}</td>
                    <td>
                      <Badge variant={statusToBadgeVariant(w.status)}>
                        {w.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="max-w-[200px] truncate text-xs text-rbx-muted">
                      {w.supportReason ?? "—"}
                    </td>
                    <td className="text-xs text-rbx-dim">
                      {formatDate(w.createdAt)}
                    </td>
                    <td>
                      <Link href={`/admin/support/${w.id}`}>
                        <Button type="button" variant="ghost" size="sm">
                          View Review
                        </Button>
                      </Link>
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
