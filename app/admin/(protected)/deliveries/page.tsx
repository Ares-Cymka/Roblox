import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DeliveryJobActions } from "@/components/admin/deliveries/DeliveryJobActions";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { listDeliveryJobsFiltered } from "@/server/services/admin-delivery";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface DeliveriesPageProps {
  searchParams: {
    status?: string;
    game?: string;
    failed?: string;
    queued?: string;
    q?: string;
  };
}

export default async function AdminDeliveriesPage({ searchParams }: DeliveriesPageProps) {
  const deliveries = await listDeliveryJobsFiltered({
    status: searchParams.status,
    game: searchParams.game,
    failedOnly: searchParams.failed === "1",
    queuedOnly: searchParams.queued === "1",
    search: searchParams.q?.trim(),
  });

  const activeFilters = [
    searchParams.status && `Status: ${searchParams.status}`,
    searchParams.game && `Game: ${searchParams.game}`,
    searchParams.failed === "1" && "Failed only",
    searchParams.queued === "1" && "Queued only",
    searchParams.q && `Search: "${searchParams.q}"`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Deliveries"
        description="Manual operator queue for withdrawal delivery jobs."
      />

      {/* Filter bar */}
      <Card title="Filters" elevated>
        <form method="GET" className="flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search code / username / bot"
            className="rbx-input w-52"
          />
          <select name="status" defaultValue={searchParams.status ?? ""} className="rbx-input w-44">
            <option value="">All statuses</option>
            {["QUEUED", "WAITING_USER", "PROCESSING", "RETRYING", "DELIVERED", "FAILED", "CANCELLED"].map(
              (s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              )
            )}
          </select>
          <select name="game" defaultValue={searchParams.game ?? ""} className="rbx-input w-36">
            <option value="">All games</option>
            {["MM2", "ADOPT_ME", "SAB", "GAG2", "OTHER"].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-rbx-muted">
            <input
              type="checkbox"
              name="failed"
              value="1"
              defaultChecked={searchParams.failed === "1"}
              className="rounded"
            />
            Failed only
          </label>
          <label className="flex items-center gap-1.5 text-sm text-rbx-muted">
            <input
              type="checkbox"
              name="queued"
              value="1"
              defaultChecked={searchParams.queued === "1"}
              className="rounded"
            />
            Queued only
          </label>
          <button
            type="submit"
            className="rounded-rbx bg-rbx-blue px-3 py-1.5 text-sm font-semibold text-white"
          >
            Apply
          </button>
          {activeFilters.length > 0 && (
            <Link
              href="/admin/deliveries"
              className="rounded-rbx border border-rbx-border px-3 py-1.5 text-sm font-semibold text-rbx-muted hover:text-rbx-text"
            >
              Clear
            </Link>
          )}
        </form>
        {activeFilters.length > 0 && (
          <p className="mt-2 text-xs text-rbx-dim">
            Filters: {activeFilters.join(" · ")}
          </p>
        )}
      </Card>

      <Card
        title="Delivery jobs"
        description={`${deliveries.length} job(s) shown`}
        elevated
      >
        {deliveries.length === 0 ? (
          <p className="text-sm text-rbx-muted">No delivery jobs match the current filters.</p>
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
