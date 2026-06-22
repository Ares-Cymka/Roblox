import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface DeliveryInstructionsCardProps {
  game: string | null;
  gameConfig: {
    deliveryMethod: string;
    requiresFriend: boolean;
    requiresPrivateServer: boolean;
    requiresCustomerJoin: boolean;
    requiresManualConfirmation: boolean;
    instructions: string | null;
  } | null;
  totalValue: number;
}

export function DeliveryInstructionsCard({
  game,
  gameConfig,
  totalValue,
}: DeliveryInstructionsCardProps) {
  if (!gameConfig) return null;

  const steps = (gameConfig.instructions ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <Card title="Delivery Instructions" elevated>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="info">{game ?? "Game"}</Badge>
        <Badge variant="neutral">
          {gameConfig.deliveryMethod.replace(/_/g, " ")}
        </Badge>
        <span className="text-sm font-semibold text-rbx-muted">
          Total: ${totalValue.toFixed(2)}
        </span>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-rbx-muted">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rbx-blue/20 text-xs font-bold text-rbx-blue">
              {index + 1}
            </span>
            <span className="pt-0.5 leading-relaxed">
              {step.replace(/^Step \d+:\s*/i, "")}
            </span>
          </li>
        ))}
      </ol>

      {gameConfig.deliveryMethod === "TRADING" && (
        <div className="mt-5 rounded-rbx border-2 border-rbx-blue/30 bg-rbx-blue/10 px-4 py-3 text-xs leading-relaxed text-blue-200">
          Trading delivery: add bot as friend, join the bot server, complete the
          trade in-game, then wait for confirmation.
        </div>
      )}

      {gameConfig.deliveryMethod === "MAILBOX" && (
        <div className="mt-5 rounded-rbx border-2 border-rbx-green/30 bg-rbx-green/10 px-4 py-3 text-xs leading-relaxed text-green-200">
          Mailbox delivery: confirm your username and wait for the bot to send
          the item through the mailbox system.
        </div>
      )}
    </Card>
  );
}
