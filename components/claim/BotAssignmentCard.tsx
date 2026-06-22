import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
}

export function BotAssignmentCard({ assignment }: BotAssignmentCardProps) {
  return (
    <Card title="Your Delivery Bot" className="border-gray-200">
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-gray-500">Bot Username</dt>
          <dd className="font-medium">{assignment.bot.robloxUsername}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-gray-500">Status</dt>
          <dd>
            <Badge variant="pending">
              {assignment.status.replace(/_/g, " ")}
            </Badge>
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-3 text-sm font-medium text-gray-900">Assigned Items</p>
        <ul className="space-y-2">
          {assignment.assignedItems.map((item) => (
            <li
              key={item.productId}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
            >
              <span>{item.name}</span>
              <span className="font-medium">× {item.quantity}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.open(assignment.bot.profileUrl, "_blank", "noopener,noreferrer")}
        >
          Add Bot
        </Button>
        <Button type="button" variant="ghost" className="border border-yellow-300 bg-yellow-50 text-yellow-900 hover:bg-yellow-100">
          I Sent Friend Request
        </Button>
        <Button type="button" disabled className="opacity-50">
          Join Game
        </Button>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Add the bot on Roblox, send a friend request, then confirm above. Join Game will unlock in a later step.
      </p>
    </Card>
  );
}
