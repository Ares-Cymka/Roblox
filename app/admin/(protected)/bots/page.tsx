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
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Username</th>
                  <th className="pb-2 pr-4 font-medium">Game</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Max Jobs</th>
                  <th className="pb-2 pr-4 font-medium">Inventory</th>
                  <th className="pb-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((bot) => (
                  <tr key={bot.id} className="border-b border-gray-50">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/bots/${bot.id}`}
                        className="font-medium text-brand-secondary hover:underline"
                      >
                        {bot.robloxUsername}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{bot.game}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={botStatusToBadgeVariant(bot.status)}>
                        {bot.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{bot.maxConcurrentDeliveries}</td>
                    <td className="py-3 pr-4">{bot._count.inventories}</td>
                    <td className="py-3 text-gray-500">{formatDate(bot.updatedAt)}</td>
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
