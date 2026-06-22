import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div>
      <AdminPageHeader title="Settings" description="Admin and system configuration." />
      <AdminPlaceholder title="Settings" description="Configure adapters, concurrency, and admin preferences." />
    </div>
  );
}
