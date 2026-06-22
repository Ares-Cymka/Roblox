import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Products"
        description="Website catalog by game. Bot inventory is managed separately."
      />
      <AdminPlaceholder
        title="Product catalog"
        description="Browse and manage imported CSV catalog products."
      />
    </div>
  );
}
