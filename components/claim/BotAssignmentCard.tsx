import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, statusToLabel } from "@/components/ui/Badge";
import { BotAvatarPlaceholder } from "@/components/ui/ProductPlaceholder";
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

  const friendSent =
    assignment.status === "READY_TO_JOIN" ||
    assignment.status === "COMPLETED" ||
    assignment.status === "JOINED";

  return (
    <Card title="Your Delivery Bot" elevated>
      {/* Bot profile row */}
      <div className="flex items-center gap-4 mb-5">
        <BotAvatarPlaceholder username={assignment.bot.robloxUsername} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-rbx-text text-lg">{assignment.bot.robloxUsername}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2 w-2 rounded-full bg-rbx-green" />
            <span className="text-xs text-rbx-green font-semibold">Online · Ready</span>
          </div>
          <Badge variant="pending" className="mt-1.5">
            {statusToLabel(assignment.status)}
          </Badge>
        </div>
      </div>

      {/* Assigned items */}
      <div className="rbx-divider pt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rbx-muted">
          Delivering
        </p>
        <ul className="space-y-2">
          {assignment.assignedItems.map((item) => (
            <li key={item.productId} className="rbx-list-row">
              <span className="text-rbx-text font-medium">{item.name}</span>
              <span className="font-bold text-rbx-blue">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mailbox message */}
      {isMailbox && !showFriend && !showJoin && (
        <div className="mt-5 rounded-rbx border border-rbx-green/30 bg-rbx-green/8 px-4 py-3">
          <p className="text-sm font-semibold text-rbx-green">📬 Mailbox Delivery</p>
          <p className="mt-1 text-xs text-rbx-muted leading-relaxed">
            No friend request needed. Your item will be sent through the in-game mailbox system.
            Keep this page open for delivery updates.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {(showFriend || showJoin) && (
        <div className="mt-5 space-y-3">
          {showFriend && (
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-rbx-muted">
                Add this bot as a Roblox friend so our team can meet you in-game.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {assignment.bot.profileUrl && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() =>
                      window.open(assignment.bot.profileUrl, "_blank", "noopener,noreferrer")
                    }
                  >
                    👤 View Bot Profile
                  </Button>
                )}
                <Button
                  type="button"
                  variant={friendSent ? "secondary" : "pending"}
                  disabled={onFriendRequestSent ? !friendRequestEnabled || actionLoading : false}
                  onClick={() => onFriendRequestSent?.()}
                >
                  {actionLoading
                    ? "Updating…"
                    : friendSent
                      ? "✓ Friend Request Sent"
                      : "I Sent Friend Request"}
                </Button>
              </div>
            </div>
          )}

          {showJoin && (
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-rbx-muted">
                {friendSent
                  ? "Friend request marked. Now join the private server to continue."
                  : "After sending the friend request, join the private server."}
              </p>
              <Button
                type="button"
                variant="success"
                disabled={!joinEnabled || actionLoading}
                onClick={onJoinGame}
                className="w-full"
                size="lg"
              >
                {actionLoading ? "Updating…" : "🎮 Join Game"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
