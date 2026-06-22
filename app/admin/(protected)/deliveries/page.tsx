import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminDeliveriesPage() {
  return (
    <div>
      <AdminPageHeader title="Deliveries" description="Delivery job queue and outcomes." />
      <AdminPlaceholder title="Deliveries" description="Inspect pending, active, and failed delivery jobs." />
    </div>
  );
}
