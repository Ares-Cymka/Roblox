"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import { DeliveryLogsCard } from "@/components/withdraw/DeliveryLogsCard";
import { WithdrawalStepIndicator } from "@/components/withdraw/WithdrawalStepIndicator";
import { WithdrawalStatusBanner } from "@/components/withdraw/WithdrawalStatusBanner";

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
  deliveryJob: { id: string; status: string } | null;
  logs: Array<{
    id: string;
    level: string;
    message: string;
    createdAt: string;
  }>;
  statusMessage: string | null;
  supportMessage: string | null;
}

// SUPPORT_REQUIRED is NOT terminal — it may be approved later, so we keep polling.
const TERMINAL_STATUSES = new Set([
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);

export default function WithdrawPage() {
  const params = useParams<{ withdrawalCode: string }>();
  const withdrawalCode = params.withdrawalCode;
  const [data, setData] = useState<WithdrawalData | null>(null);
  const [robloxUsername, setRobloxUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const refreshWithdrawal = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
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
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [withdrawalCode]
  );

  const pollWithdrawal = useCallback(async () => {
    if (!data?.withdrawal.id) return;

    try {
      const res = await fetch(`/api/withdrawals/${data.withdrawal.id}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setRobloxUsername(json.withdrawal.robloxUsername ?? "");
      }
    } catch {
      // Keep polling quietly on transient network errors.
    }
  }, [data?.withdrawal.id]);

  useEffect(() => {
    refreshWithdrawal();
  }, [refreshWithdrawal]);

  useEffect(() => {
    if (!data?.withdrawal.id) return;
    if (TERMINAL_STATUSES.has(data.withdrawal.status)) return;

    const interval = window.setInterval(() => {
      void pollWithdrawal();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [data?.withdrawal.id, data?.withdrawal.status, pollWithdrawal]);

  async function handleUsername(e: FormEvent) {
    e.preventDefault();
    if (!data) return;

    setActionLoading(true);
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
      setActionLoading(false);
    }
  }

  async function handleStartWithdrawal() {
    if (!data) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/withdrawals/${data.withdrawal.id}/start`, {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok) {
        const shortageText = Array.isArray(json.shortages)
          ? json.shortages
              .map(
                (entry: { name: string; required: number; available: number }) =>
                  `${entry.name}: need ${entry.required}, bot has ${entry.available}`
              )
              .join("; ")
          : null;

        setError(
          json.hint ??
            (shortageText
              ? `${json.error ?? "Failed to start withdrawal delivery"} (${shortageText})`
              : json.error ?? "Failed to start withdrawal delivery")
        );
        return;
      }

      setData(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFriendRequestSent() {
    if (!data?.assignment) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/withdrawals/${data.withdrawal.id}/friend-request-sent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botAssignmentId: data.assignment.id }),
        }
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to update friend request status");
        return;
      }

      setData(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleJoinGame() {
    if (!data?.assignment) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/withdrawals/${data.withdrawal.id}/join-game`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botAssignmentId: data.assignment.id }),
        }
      );
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to join game");
        return;
      }

      setData(json);

      const serverUrl =
        json.privateServerUrl ?? data.assignment.bot.privateServerUrl;
      if (serverUrl) {
        window.open(serverUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
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
  const statusBannerVariant =
    data.withdrawal.status === "DELIVERED"
      ? "success"
      : data.withdrawal.status === "FAILED"
        ? "warning"
        : isSupportRequired
          ? "warning"
          : "info";

  return (
    <PageShell narrow>
      <PageHeader
        title="Withdrawal"
        description="Track your inventory withdrawal and delivery progress."
      />

      <div className="space-y-6">
        <Card title="Progress" elevated>
          <WithdrawalStepIndicator
            deliveryMethod={data.gameConfig?.deliveryMethod}
            withdrawalStatus={data.withdrawal.status}
            hasUsername={Boolean(data.withdrawal.robloxUsername)}
            hasAssignment={Boolean(data.assignment)}
            assignmentStatus={data.assignment?.status}
            deliveryJobStatus={data.deliveryJob?.status}
          />
        </Card>

        {(data.statusMessage || data.supportMessage) && (
          <WithdrawalStatusBanner
            message={data.supportMessage ?? data.statusMessage}
            variant={statusBannerVariant}
          />
        )}

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
            {data.withdrawal.robloxUsername && (
              <div className="flex justify-between gap-4">
                <dt className="rbx-label">Roblox Username</dt>
                <dd className="rbx-value">{data.withdrawal.robloxUsername}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="rbx-label">Total Value</dt>
              <dd className="rbx-value">${data.withdrawal.totalValue.toFixed(2)}</dd>
            </div>
            {data.game && (
              <div className="flex justify-between gap-4">
                <dt className="rbx-label">Game</dt>
                <dd className="rbx-value">{data.game}</dd>
              </div>
            )}
            {data.gameConfig?.deliveryMethod && (
              <div className="flex justify-between gap-4">
                <dt className="rbx-label">Delivery Method</dt>
                <dd className="rbx-value">
                  {data.gameConfig.deliveryMethod.replace(/_/g, " ")}
                </dd>
              </div>
            )}
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
              <Button
                type="submit"
                disabled={actionLoading}
                className="w-full"
                size="lg"
              >
                {actionLoading ? "Saving..." : "Continue"}
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
              disabled={actionLoading}
              onClick={handleStartWithdrawal}
              className="w-full"
              size="lg"
            >
              {actionLoading ? "Starting..." : "Start Delivery"}
            </Button>
          </Card>
        )}

        {data.assignment && (
          <BotAssignmentCard
            assignment={data.assignment}
            gameConfig={data.gameConfig}
            withdrawalStatus={data.withdrawal.status}
            onFriendRequestSent={handleFriendRequestSent}
            onJoinGame={handleJoinGame}
            actionLoading={actionLoading}
          />
        )}

        <DeliveryLogsCard logs={data.logs} />

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
