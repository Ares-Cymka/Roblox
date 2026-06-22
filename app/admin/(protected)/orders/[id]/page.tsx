import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getOrderById,
  orderInventoryCredited,
} from "@/server/services/order-checkout";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface AdminOrderDetailPageProps {
  params: { id: string };
}

export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const order = await getOrderById(params.id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Order Detail" description={order.orderCode}>
        <Link href="/admin/orders">
          <Button variant="ghost">Back to Orders</Button>
        </Link>
      </AdminPageHeader>

      <Card title="Summary" elevated>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="rbx-label">Order Code</dt>
            <dd className="font-mono font-semibold text-rbx-text">{order.orderCode}</dd>
          </div>
          <div>
            <dt className="rbx-label">Customer Email</dt>
            <dd>{order.customerEmail ?? order.customer?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="rbx-label">Session ID</dt>
            <dd className="font-mono text-sm">{order.sessionId ?? "—"}</dd>
          </div>
          <div>
            <dt className="rbx-label">Payment Status</dt>
            <dd>
              <Badge variant={statusToBadgeVariant(order.paymentStatus)}>
                {order.paymentStatus}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Order Status</dt>
            <dd>
              <Badge variant={statusToBadgeVariant(order.status)}>
                {order.status.replace(/_/g, " ")}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Total</dt>
            <dd className="font-semibold text-rbx-green">
              ${Number(order.totalAmount ?? 0).toFixed(2)} {order.currency.toUpperCase()}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Stripe Session</dt>
            <dd className="break-all font-mono text-xs">
              {order.stripeCheckoutSessionId ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Inventory Credited</dt>
            <dd>
              {orderInventoryCredited(order) ? (
                <Badge variant="success">Yes</Badge>
              ) : (
                <Badge variant="pending">No</Badge>
              )}
            </dd>
          </div>
          <div>
            <dt className="rbx-label">Created</dt>
            <dd>{formatDate(order.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Items" elevated>
        <ul className="space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="rbx-list-row">
              <span>
                {item.product.name}
                <span className="text-rbx-dim"> · {item.product.game}</span>
              </span>
              <span className="font-bold text-rbx-green">
                x {item.quantity} · ${Number(item.totalPrice ?? 0).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {order.customerInventoryLogs.length > 0 && (
        <Card title="Customer Inventory Logs" elevated>
          <ul className="space-y-2">
            {order.customerInventoryLogs.map((log) => (
              <li key={log.id} className="rounded-rbx border border-rbx-border px-4 py-3 text-sm">
                <span className="font-semibold text-rbx-text">{log.reason}</span>
                <span className="text-rbx-muted"> · delta {log.delta}</span>
                <span className="text-rbx-dim"> · {formatDate(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
