import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DeliveryJobDetailActions } from "@/components/admin/deliveries/DeliveryJobDetailActions";
import { DeliveryProofForm } from "@/components/admin/deliveries/DeliveryProofForm";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { getDeliveryJobDetail } from "@/server/services/admin-delivery";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

interface DeliveryDetailPageProps {
  params: { id: string };
}

export default async function AdminDeliveryDetailPage({
  params,
}: DeliveryDetailPageProps) {
  const delivery = await getDeliveryJobDetail(params.id);
  if (!delivery) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Delivery Details"
        description={`Job ${delivery.id}`}
      >
        <Link href="/admin/deliveries">
          <Button variant="ghost">Back to Deliveries</Button>
        </Link>
      </AdminPageHeader>

      <Card title="Summary" elevated>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="rbx-label">Withdrawal Code</dt>
            <dd className="font-mono font-semibold text-rbx-text">
              {delivery.withdrawal?.withdrawalCode ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Status</dt>
            <dd>
              <Badge variant={statusToBadgeVariant(delivery.status)}>
                {delivery.status.replace(/_/g, " ")}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Customer Roblox Username</dt>
            <dd className="rbx-value">
              {delivery.withdrawal?.robloxUsername ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Game</dt>
            <dd className="rbx-value">{delivery.game ?? "—"}</dd>
          </div>
          <div>
            <dt className="rbx-label">Delivery Method</dt>
            <dd className="rbx-value">
              {delivery.deliveryMethod?.replace(/_/g, " ") ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Attempts</dt>
            <dd className="rbx-value">{delivery.attempts}</dd>
          </div>
          <div>
            <dt className="rbx-label">Created</dt>
            <dd className="text-rbx-muted">{formatDate(delivery.createdAt)}</dd>
          </div>
          {delivery.deliveredAt && (
            <div>
              <dt className="rbx-label">Delivered</dt>
              <dd className="text-rbx-muted">{formatDate(delivery.deliveredAt)}</dd>
            </div>
          )}
        </dl>
      </Card>

      {delivery.assignment && (
        <Card title="Assigned Bot" elevated>
          <dl className="space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="rbx-label">Bot Username</dt>
              <dd className="rbx-value">{delivery.assignment.bot.robloxUsername}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="rbx-label">Assignment Status</dt>
              <dd>
                <Badge variant="pending">
                  {delivery.assignment.status.replace(/_/g, " ")}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="rbx-label">Profile URL</dt>
              <dd className="mt-1 break-all">
                <a
                  href={delivery.assignment.bot.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-rbx-blue hover:underline"
                >
                  {delivery.assignment.bot.profileUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt className="rbx-label">Private Server URL</dt>
              <dd className="mt-1 break-all text-rbx-muted">
                {delivery.assignment.bot.privateServerUrl ? (
                  <a
                    href={delivery.assignment.bot.privateServerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-rbx-blue hover:underline"
                  >
                    {delivery.assignment.bot.privateServerUrl}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </Card>
      )}

      <Card title="Items To Deliver" elevated>
        <ul className="space-y-2">
          {delivery.items.map((item) => (
            <li key={item.productId} className="rbx-list-row">
              <span>
                {item.name}
                {item.rarity ? (
                  <span className="text-rbx-dim"> · {item.rarity}</span>
                ) : null}
              </span>
              <span className="font-bold text-rbx-green">x {item.quantity}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Operator Instructions" elevated>
        <ol className="space-y-3">
          {delivery.operatorInstructions.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm text-rbx-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rbx-blue/20 text-xs font-bold text-rbx-blue">
                {index + 1}
              </span>
              <span className="pt-0.5 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      {delivery.gameConfig?.instructions && (
        <Card title="Customer Delivery Instructions" elevated>
          <ol className="space-y-2">
            {delivery.gameConfig.instructions
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, index) => (
                <li key={line} className="text-sm text-rbx-muted">
                  {index + 1}. {line.replace(/^Step \d+:\s*/i, "")}
                </li>
              ))}
          </ol>
        </Card>
      )}

      <Card title="Operator Actions" elevated>
        <DeliveryJobDetailActions
          deliveryJobId={delivery.id}
          status={delivery.status}
        />
      </Card>

      {delivery.status === "DELIVERED" && (
        <Card title="Delivery Proof" elevated>
          <p className="mb-4 text-sm text-rbx-muted">
            Optionally attach proof of delivery (trade screenshot URL, confirmation note, etc.).
          </p>
          <DeliveryProofForm deliveryJobId={delivery.id} />
        </Card>
      )}

      <Card title="Delivery Logs" elevated>
        {delivery.logs.length === 0 ? (
          <p className="text-sm text-rbx-muted">No logs yet.</p>
        ) : (
          <ul className="space-y-3">
            {delivery.logs.map((log) => (
              <li
                key={log.id}
                className="rounded-rbx border border-rbx-border bg-rbx-panel px-4 py-3"
              >
                <p className="text-sm text-rbx-text">{log.message}</p>
                {"proofText" in log && log.proofText && (
                  <p className="mt-1 text-xs font-semibold text-rbx-green">
                    Proof: {log.proofText}
                  </p>
                )}
                {"proofImageUrl" in log && log.proofImageUrl && (
                  <a
                    href={log.proofImageUrl as string}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs text-rbx-blue hover:underline"
                  >
                    View proof image
                  </a>
                )}
                <p className="mt-1 text-xs text-rbx-dim">{formatDate(log.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
