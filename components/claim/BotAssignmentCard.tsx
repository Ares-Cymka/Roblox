import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  canJoinGame,
  canSendFriendRequest,
} from "@/lib/withdrawal-status";

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
  withdrawalStatus?: string;
  onFriendRequestSent?: () => void;
  onJoinGame?: () => void;
  actionLoading?: boolean;
}

export function BotAssignmentCard({
  assignment,
  gameConfig,
  withdrawalStatus,
  onFriendRequestSent,
  onJoinGame,
  actionLoading = false,
}: BotAssignmentCardProps) {
  const isMailbox = gameConfig?.deliveryMethod === "MAILBOX";
  const showFriend = gameConfig?.requiresFriend ?? !isMailbox;
  const showJoin = gameConfig?.requiresCustomerJoin ?? !isMailbox;
  const friendRequestEnabled = canSendFriendRequest(assignment.status);
  const joinEnabled =
    Boolean(onJoinGame) &&
    canJoinGame(assignment.status, withdrawalStatus ?? "") &&
    (!gameConfig?.requiresCustomerJoin || Boolean(assignment.bot.privateServerUrl));

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

      {isMailbox && !showFriend && !showJoin && (
        <p className="mt-5 rounded-rbx border-2 border-rbx-green/30 bg-rbx-green/10 px-4 py-3 text-sm leading-relaxed text-green-200">
          Your item will be sent through the mailbox system. Keep this page open
          for delivery updates.
        </p>
      )}

      {(showFriend || showJoin) && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {showFriend && assignment.bot.profileUrl && (
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
              <Button
                type="button"
                variant="pending"
                disabled={
                  onFriendRequestSent
                    ? !friendRequestEnabled || actionLoading
                    : false
                }
                onClick={() => onFriendRequestSent?.()}
              >
                {actionLoading ? "Updating..." : "I Sent Friend Request"}
              </Button>
            </>
          )}
          {showJoin && (
            <Button
              type="button"
              disabled={!joinEnabled || actionLoading}
              variant="outline"
              onClick={onJoinGame}
            >
              {actionLoading ? "Updating..." : "Join Game"}
            </Button>
          )}
        </div>
      )}

      {showFriend && showJoin && (
        <p className="mt-4 text-xs leading-relaxed text-rbx-dim">
          Add the bot on Roblox, send a friend request, confirm above, then join
          the private server to complete your trade.
        </p>
      )}
    </Card>
  );
}
