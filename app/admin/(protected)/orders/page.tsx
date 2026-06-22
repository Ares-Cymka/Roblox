import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listOrders } from "@/server/services/order";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await listOrders();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        description="Customer purchase orders and generated claim codes."
      >
        <Link href="/admin/orders/new">
          <Button>Create Test Order</Button>
        </Link>
      </AdminPageHeader>

      <Card title="Orders" description={`${orders.length} order(s)`} elevated>
        {orders.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No orders yet.</p>
            <Link href="/admin/orders/new">
              <Button variant="secondary">Create your first test order</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="rbx-table">
              <thead>
                <tr>
                  <th>Order Code</th>
                  <th>Claim Code</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const claim = order.claims[0];
                  const game = order.items[0]?.product.game;

                  return (
                    <tr key={order.id}>
                      <td className="font-mono font-semibold text-rbx-text">
                        {order.orderCode}
                      </td>
                      <td className="font-mono">{claim?.claimCode ?? "—"}</td>
                      <td>{order.customer?.robloxUsername ?? "—"}</td>
                      <td>
                        {order._count.items}
                        {game ? ` · ${game}` : ""}
                      </td>
                      <td>
                        <Badge variant={statusToBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
