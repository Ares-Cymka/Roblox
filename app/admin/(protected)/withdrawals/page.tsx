import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { listWithdrawals } from "@/server/services/withdrawal";
import { formatDate } from "@/lib/utils";
import { WithdrawalActions } from "@/components/admin/withdrawals/WithdrawalActions";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  const withdrawals = await listWithdrawals();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Withdrawals"
        description="RNGBLOX inventory withdrawals and delivery queue status."
      />

      <Card title="Withdrawals" description={`${withdrawals.length} withdrawal(s)`} elevated>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-rbx-muted">No withdrawals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rbx-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Username</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id}>
                    <td className="font-mono font-semibold text-rbx-text">
                      {withdrawal.withdrawalCode}
                    </td>
                    <td>
                      {withdrawal.customer?.testCode ?? withdrawal.sessionId ?? "—"}
                    </td>
                    <td>{withdrawal.robloxUsername ?? "—"}</td>
                    <td className="font-semibold text-rbx-green">
                      ${Number(withdrawal.totalValue).toFixed(2)}
                    </td>
                    <td>
                      <Badge variant={statusToBadgeVariant(withdrawal.status)}>
                        {withdrawal.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td>{formatDate(withdrawal.createdAt)}</td>
                    <td>
                      <WithdrawalActions
                        withdrawalId={withdrawal.id}
                        status={withdrawal.status}
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
