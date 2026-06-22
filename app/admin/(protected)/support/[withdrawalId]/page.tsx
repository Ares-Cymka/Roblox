import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SupportReviewActions } from "@/components/admin/support/SupportReviewActions";
import { getSupportWithdrawal } from "@/server/services/support-review";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SupportReviewDetailPageProps {
  params: { withdrawalId: string };
}

export default async function SupportReviewDetailPage({
  params,
}: SupportReviewDetailPageProps) {
  const w = await getSupportWithdrawal(params.withdrawalId);
  if (!w) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Support Review"
        description={w.withdrawalCode}
      >
        <Link href="/admin/support">
          <Button variant="ghost">Back to Support Queue</Button>
        </Link>
      </AdminPageHeader>

      <Card title="Summary" elevated>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="rbx-label">Withdrawal Code</dt>
            <dd className="font-mono font-semibold text-rbx-text">
              {w.withdrawalCode}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Status</dt>
            <dd>
              <Badge variant={statusToBadgeVariant(w.status)}>
                {w.status.replace(/_/g, " ")}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Customer</dt>
            <dd className="rbx-value">
              {w.customer?.email ?? w.sessionId ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Roblox Username</dt>
            <dd className="rbx-value">{w.robloxUsername ?? "—"}</dd>
          </div>
          <div>
            <dt className="rbx-label">Game</dt>
            <dd className="rbx-value">{w.game ?? "—"}</dd>
          </div>
          <div>
            <dt className="rbx-label">Total Value</dt>
            <dd className="font-bold text-rbx-yellow">
              ${w.totalValue.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Support Reason</dt>
            <dd className="text-sm text-rbx-muted">
              {w.supportReason ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Created</dt>
            <dd className="text-rbx-muted">{formatDate(w.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Items" elevated>
        <ul className="space-y-2">
          {w.items.map((item) => (
            <li key={item.id} className="rbx-list-row">
              <span>
                {item.name}
                {item.rarity ? (
                  <span className="text-rbx-dim"> · {item.rarity}</span>
                ) : null}
                <span className="text-rbx-dim"> · {item.game}</span>
              </span>
              <span className="font-bold text-rbx-green">
                x {item.quantity} · ${(item.value * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {w.deliveryJob && (
        <Card title="Delivery Logs" elevated>
          {w.deliveryJob.logs.length === 0 ? (
            <p className="text-sm text-rbx-muted">No delivery logs yet.</p>
          ) : (
            <ul className="space-y-3">
              {w.deliveryJob.logs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-rbx border border-rbx-border bg-rbx-panel px-4 py-3"
                >
                  <p className="text-sm text-rbx-text">{log.message}</p>
                  {log.proofText && log.proofText !== log.message && (
                    <p className="mt-1 text-xs text-rbx-green">
                      Proof: {log.proofText}
                    </p>
                  )}
                  {log.proofImageUrl && (
                    <a
                      href={log.proofImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs text-rbx-blue hover:underline"
                    >
                      View proof image
                    </a>
                  )}
                  <p className="mt-1 text-xs text-rbx-dim">
                    {formatDate(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {w.supportNotes.length > 0 && (
        <Card title="Support Notes" elevated>
          <ul className="space-y-3">
            {w.supportNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-rbx border border-rbx-border bg-rbx-panel px-4 py-3"
              >
                <p className="text-sm text-rbx-text">{note.note}</p>
                <p className="mt-1 text-xs text-rbx-dim">
                  {note.adminUser?.email ?? "Support"} ·{" "}
                  {formatDate(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SupportReviewActions
        withdrawalId={w.id}
        status={w.status}
      />
    </div>
  );
}
