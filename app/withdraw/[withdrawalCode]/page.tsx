"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { BotAssignmentCard } from "@/components/claim/BotAssignmentCard";
import { DeliveryInstructionsCard } from "@/components/withdraw/DeliveryInstructionsCard";

interface WithdrawalData {
  withdrawal: {
    id: string;
    withdrawalCode: string;
    status: string;
    robloxUsername: string | null;
    totalValue: number;
    supportReason: string | null;
  };
  game: string | null;
  gameConfig: {
    deliveryMethod: string;
    requiresFriend: boolean;
    requiresPrivateServer: boolean;
    requiresCustomerJoin: boolean;
    requiresManualConfirmation: boolean;
    instructions: string | null;
  } | null;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitValue: number;
    rarity: string | null;
  }>;
  assignment: {
    id: string;
    status: string;
    bot: {
      robloxUsername: string;
      profileUrl: string;
      privateServerUrl: string | null;
    };
    assignedItems: Array<{ productId: string; name: string; quantity: number }>;
  } | null;
  supportMessage: string | null;
}

export default function WithdrawPage() {
  const params = useParams<{ withdrawalCode: string }>();
  const withdrawalCode = params.withdrawalCode;
  const [data, setData] = useState<WithdrawalData | null>(null);
  const [robloxUsername, setRobloxUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadWithdrawal() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/withdrawals/lookup/${encodeURIComponent(withdrawalCode)}`
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to load withdrawal");
        setData(null);
        return;
      }

      setData(json);
      setRobloxUsername(json.withdrawal.robloxUsername ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWithdrawal();
  }, [withdrawalCode]);

  async function handleUsername(e: FormEvent) {
    e.preventDefault();
    if (!data) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/withdrawals/lookup/${encodeURIComponent(withdrawalCode)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ robloxUsername: robloxUsername.trim() }),
        }
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to save username");
        return;
      }

      setData(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartWithdrawal() {
    if (!data) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/withdrawals/${data.withdrawal.id}/start`, {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to start withdrawal delivery");
        return;
      }

      setData(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <PageShell narrow>
        <div className="py-16 text-center text-sm font-semibold text-rbx-muted">
          Loading withdrawal...
        </div>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell narrow>
        <div className="space-y-4 py-12">{error && <Alert>{error}</Alert>}</div>
      </PageShell>
    );
  }

  const isSupportRequired = data.withdrawal.status === "SUPPORT_REQUIRED";
  const needsUsername =
    data.withdrawal.status === "USERNAME_REQUIRED" ||
    data.withdrawal.status === "PENDING";
  const canStart =
    data.withdrawal.status === "QUEUED" &&
    Boolean(data.withdrawal.robloxUsername) &&
    !data.assignment;

  return (
    <PageShell narrow>
      <PageHeader
        title="Withdrawal"
        description="Track your inventory withdrawal and delivery progress."
      />

      <div className="space-y-6">
        <Card title="Withdrawal Details" elevated>
          <dl className="space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="rbx-label">Withdrawal Code</dt>
              <dd className="font-mono text-sm font-bold text-rbx-text">
                {data.withdrawal.withdrawalCode}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="rbx-label">Status</dt>
              <dd>
                <Badge variant={statusToBadgeVariant(data.withdrawal.status)}>
                  {data.withdrawal.status.replace(/_/g, " ")}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="rbx-label">Total Value</dt>
              <dd className="rbx-value">${data.withdrawal.totalValue.toFixed(2)}</dd>
            </div>
          </dl>

          <div className="rbx-divider mt-5 pt-4">
            <p className="mb-3 text-sm font-bold text-rbx-text">Items</p>
            <ul className="space-y-2">
              {data.items.map((item) => (
                <li key={item.id} className="rbx-list-row">
                  <span>
                    {item.name}
                    {item.rarity ? (
                      <span className="text-rbx-dim"> · {item.rarity}</span>
                    ) : null}
                  </span>
                  <span className="font-bold text-rbx-green">x {item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {isSupportRequired && data.supportMessage && (
          <Alert>{data.supportMessage}</Alert>
        )}

        {!isSupportRequired && (
          <DeliveryInstructionsCard
            game={data.game}
            gameConfig={data.gameConfig}
            totalValue={data.withdrawal.totalValue}
          />
        )}

        {needsUsername && !isSupportRequired && (
          <Card title="Roblox Username" elevated>
            <form onSubmit={handleUsername} className="space-y-4">
              <Input
                label="Roblox Username"
                value={robloxUsername}
                onChange={(e) => setRobloxUsername(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Saving..." : "Continue"}
              </Button>
            </form>
          </Card>
        )}

        {canStart && !isSupportRequired && (
          <Card title="Start Delivery" elevated>
            <p className="mb-4 text-sm text-rbx-muted">
              Username linked. Start delivery to assign a bot from the queue.
            </p>
            <Button
              type="button"
              disabled={loading}
              onClick={handleStartWithdrawal}
              className="w-full"
              size="lg"
            >
              {loading ? "Starting..." : "Start Delivery"}
            </Button>
          </Card>
        )}

        {data.assignment && (
          <BotAssignmentCard
            assignment={data.assignment}
            gameConfig={data.gameConfig}
          />
        )}

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
