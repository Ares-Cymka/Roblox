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

      <Card title="Orders" description={`${orders.length} order(s)`}>
        {orders.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No orders yet.</p>
            <Link href="/admin/orders/new">
              <Button variant="secondary">Create your first test order</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Order Code</th>
                  <th className="pb-2 pr-4 font-medium">Claim Code</th>
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Items</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const claim = order.claims[0];
                  const game = order.items[0]?.product.game;

                  return (
                    <tr key={order.id} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-mono font-medium">
                        {order.orderCode}
                      </td>
                      <td className="py-3 pr-4 font-mono">
                        {claim?.claimCode ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {order.customer?.robloxUsername ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {order._count.items}
                        {game ? ` · ${game}` : ""}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusToBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
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
