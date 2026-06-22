import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface GameConfig {
  deliveryMethod: string;
  requiresFriend: boolean;
  requiresPrivateServer: boolean;
  requiresCustomerJoin: boolean;
  instructions: string | null;
}

interface AssignedItem {
  productId: string;
  name: string;
  quantity: number;
}

interface BotAssignmentCardProps {
  assignment: {
    id: string;
    status: string;
    bot: {
      robloxUsername: string;
      profileUrl: string;
      privateServerUrl: string | null;
    };
    assignedItems: AssignedItem[];
  };
  gameConfig?: GameConfig | null;
}

export function BotAssignmentCard({
  assignment,
  gameConfig,
}: BotAssignmentCardProps) {
  const showFriend = gameConfig?.requiresFriend ?? true;
  const showJoin = gameConfig?.requiresCustomerJoin ?? true;

  return (
    <Card title="Your Delivery Bot" elevated>
      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <dt className="rbx-label">Bot Username</dt>
          <dd className="rbx-value">{assignment.bot.robloxUsername}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="rbx-label">Status</dt>
          <dd>
            <Badge variant="pending">
              {assignment.status.replace(/_/g, " ")}
            </Badge>
          </dd>
        </div>
      </dl>

      <div className="rbx-divider mt-5 pt-4">
        <p className="mb-3 text-sm font-bold text-rbx-text">Assigned Items</p>
        <ul className="space-y-2">
          {assignment.assignedItems.map((item) => (
            <li key={item.productId} className="rbx-list-row">
              <span>{item.name}</span>
              <span className="font-bold text-rbx-green">x {item.quantity}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {showFriend && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                window.open(
                  assignment.bot.profileUrl,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              Add Bot
            </Button>
            <Button type="button" variant="pending">
              I Sent Friend Request
            </Button>
          </>
        )}
        {showJoin && (
          <Button type="button" disabled variant="outline">
            Join Game
          </Button>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-rbx-dim">
        Add the bot on Roblox, send a friend request, then confirm above. Join
        Game unlocks in a later step.
      </p>
    </Card>
  );
}
