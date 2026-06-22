import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BotAccountForm } from "@/components/admin/bots/BotAccountForm";
import { BotInventoryManager } from "@/components/admin/bots/BotInventoryManager";
import { BotInventoryTable } from "@/components/admin/bots/BotInventoryTable";
import { SyncBotCatalogButton } from "@/components/admin/bots/SyncBotCatalogButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getBotAccountById,
  listProductsForGame,
} from "@/server/services/bot";
import { botStatusToBadgeVariant } from "@/lib/bot-status";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface BotDetailPageProps {
  params: { id: string };
}

export default async function BotDetailPage({ params }: BotDetailPageProps) {
  const bot = await getBotAccountById(params.id);
  if (!bot) notFound();

  const products = await listProductsForGame(bot.game);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={bot.robloxUsername}
        description={`${bot.game} delivery bot · ${bot._count.assignments} assignment(s)`}
      >
        <div className="flex gap-2">
          <Badge variant={botStatusToBadgeVariant(bot.status)}>{bot.status}</Badge>
          <Link href="/admin/bots">
            <Button variant="ghost">Back to Bots</Button>
          </Link>
        </div>
      </AdminPageHeader>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Edit bot account">
          <BotAccountForm
            mode="edit"
            botId={bot.id}
            initialValues={{
              game: bot.game,
              robloxUsername: bot.robloxUsername,
              robloxUserId: bot.robloxUserId ?? "",
              profileUrl: bot.profileUrl,
              privateServerUrl: bot.privateServerUrl ?? "",
              status: bot.status,
              maxConcurrentDeliveries: bot.maxConcurrentDeliveries,
            }}
          />
        </Card>

        <Card title="Bot info">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Current deliveries</dt>
              <dd className="font-medium">{bot.currentDeliveries}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Roblox User ID</dt>
              <dd className="font-medium">{bot.robloxUserId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Profile</dt>
              <dd className="mt-1 break-all">
                <a
                  href={bot.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-secondary hover:underline"
                >
                  {bot.profileUrl}
                </a>
              </dd>
            </div>
            {bot.privateServerUrl && (
              <div>
                <dt className="text-gray-500">Private server</dt>
                <dd className="mt-1 break-all">
                  <a
                    href={bot.privateServerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-secondary hover:underline"
                  >
                    {bot.privateServerUrl}
                  </a>
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-600">{formatDate(bot.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Updated</dt>
              <dd className="text-gray-600">{formatDate(bot.updatedAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <BotInventoryManager botId={bot.id} game={bot.game} products={products} />

      <SyncBotCatalogButton botId={bot.id} productCount={products.length} />

      <Card
        title="In-game inventory"
        description="Items this bot currently holds inside Roblox."
      >
        <BotInventoryTable botId={bot.id} items={bot.inventories} />
      </Card>
    </div>
  );
}
