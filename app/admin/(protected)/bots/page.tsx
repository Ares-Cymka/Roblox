import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export const dynamic = "force-dynamic";

export default function AdminBotsPage() {
  return (
    <div>
      <AdminPageHeader
        title="Bots"
        description="Delivery bot accounts. No Roblox passwords are stored."
      />
      <AdminPlaceholder
        title="Bot accounts"
        description="Monitor bot status, assignments, and inventory."
      />
    </div>
  );
}
