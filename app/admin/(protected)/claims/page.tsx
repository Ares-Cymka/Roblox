import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminClaimsPage() {
  return (
    <div>
      <AdminPageHeader title="Claims" description="Customer claim codes and redemption status." />
      <AdminPlaceholder title="Claims" description="Track claim progress from code to delivery." />
    </div>
  );
}
