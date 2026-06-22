import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { listBotAccounts } from "@/server/services/bot";
import { botStatusToBadgeVariant } from "@/lib/bot-status";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBotsPage() {
  const bots = await listBotAccounts();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bots"
        description="Client-owned delivery bot accounts. No Roblox passwords are stored."
      >
        <Link href="/admin/bots/new">
          <Button>Create Bot</Button>
        </Link>
      </AdminPageHeader>

      <Card title="Bot accounts" description={`${bots.length} bot(s) configured`}>
        {bots.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No bot accounts yet.</p>
            <Link href="/admin/bots/new">
              <Button variant="secondary">Create your first bot</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="rbx-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Game</th>
                  <th>Status</th>
                  <th>Max Jobs</th>
                  <th>Inventory</th>
                  <th>Active Jobs</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((bot) => (
                  <tr key={bot.id}>
                    <td className="font-semibold text-rbx-text">
                      <Link
                        href={`/admin/bots/${bot.id}`}
                        className="text-rbx-blue hover:underline"
                      >
                        {bot.robloxUsername}
                      </Link>
                    </td>
                    <td>{bot.game}</td>
                    <td>
                      <Badge variant={botStatusToBadgeVariant(bot.status)}>
                        {bot.status}
                      </Badge>
                    </td>
                    <td>{bot.maxConcurrentDeliveries}</td>
                    <td>{bot._count.inventories}</td>
                    <td>{bot.currentDeliveries}</td>
                    <td>{formatDate(bot.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
