import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminLogsPage() {
  return (
    <div>
      <AdminPageHeader title="Logs" description="Delivery and inventory audit logs." />
      <AdminPlaceholder title="Logs" description="Review DeliveryLog and InventoryLog entries." />
    </div>
  );
}
