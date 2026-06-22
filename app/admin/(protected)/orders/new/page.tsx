import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateOrderForm } from "@/components/admin/orders/CreateOrderForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function NewOrderPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create Test Order"
        description="Generate an order, order items, claim, and claim items for testing."
      >
        <Link href="/admin/orders">
          <Button variant="ghost">Back to Orders</Button>
        </Link>
      </AdminPageHeader>

      <Card title="Order details">
        <CreateOrderForm />
      </Card>
    </div>
  );
}
