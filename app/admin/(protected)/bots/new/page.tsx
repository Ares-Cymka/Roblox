import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BotAccountForm } from "@/components/admin/bots/BotAccountForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function NewBotPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create Bot Account"
        description="Register a client-owned Roblox bot for deliveries."
      >
        <Link href="/admin/bots">
          <Button variant="ghost">Back to Bots</Button>
        </Link>
      </AdminPageHeader>

      <Card title="Bot details">
        <BotAccountForm
          mode="create"
          initialValues={{
            game: "MM2",
            robloxUsername: "",
            status: "ONLINE",
            maxConcurrentDeliveries: 1,
          }}
        />
      </Card>
    </div>
  );
}
