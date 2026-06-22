import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listPaidOrders, orderInventoryCredited } from "@/server/services/order-checkout";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listPaidOrders();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        description="Stripe purchases and customer inventory credits."
      >
        <div className="flex gap-2">
          <Link href="/store">
            <Button variant="secondary">Open Store</Button>
          </Link>
          <Link href="/admin/orders/new">
            <Button>Create Test Order</Button>
          </Link>
        </div>
      </AdminPageHeader>

      <Card title="Orders" description={`${orders.length} order(s)`} elevated>
        {orders.length === 0 ? (
          <p className="text-sm text-rbx-muted">No paid orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="rbx-table">
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Email</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Total</th>
                  <th>Stripe Session</th>
                  <th>Items</th>
                  <th>Credited</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono font-semibold text-rbx-text">
                      {order.orderCode}
                    </td>
                    <td>{order.customerEmail ?? order.customer?.email ?? "—"}</td>
                    <td>
                      <Badge variant={statusToBadgeVariant(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={statusToBadgeVariant(order.status)}>
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="font-semibold text-rbx-green">
                      ${Number(order.totalAmount ?? 0).toFixed(2)}
                    </td>
                    <td className="max-w-[140px] truncate font-mono text-xs">
                      {order.stripeCheckoutSessionId ?? "—"}
                    </td>
                    <td>
                      {order.items
                        .map((item) => `${item.product.name} x${item.quantity}`)
                        .join(", ")}
                    </td>
                    <td>
                      {orderInventoryCredited(order) ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <Badge variant="pending">No</Badge>
                      )}
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button type="button" variant="ghost">
                          View
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
