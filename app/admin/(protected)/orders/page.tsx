import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return (
    <div>
      <AdminPageHeader title="Orders" description="Customer purchase orders." />
      <AdminPlaceholder title="Orders" description="View and manage order records." />
    </div>
  );
}
