"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant, statusToLabel } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { BotAssignmentCard } from "@/components/claim/BotAssignmentCard";
import { DeliveryInstructionsCard } from "@/components/withdraw/DeliveryInstructionsCard";
import { DeliveryTimeline } from "@/components/withdraw/DeliveryTimeline";
import { WithdrawalStepIndicator } from "@/components/withdraw/WithdrawalStepIndicator";
import { MM2DeliveryPanel } from "@/components/withdraw/MM2DeliveryPanel";

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
  queuePosition: number | null;
  estimatedWaitMinutes: number | null;
  mm2Session: {
    id: string;
    status: string;
    customerRobloxUsername: string;
    privateServerUrl: string | null;
    customerJoinedAt: string | null;
    operatorReadyAt: string | null;
    tradeStartedAt: string | null;
    tradeCompletedAt: string | null;
    statusMessage: { message: string; variant: "info" | "success" | "warning" | "error" } | null;
  } | null;
}

// SUPPORT_REQUIRED is NOT terminal — it may be approved later, so we keep polling.
const TERMINAL_STATUSES = new Set([
  "DELIVERED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
]);

const STATUS_MESSAGES: Record<string, { message: string; variant: "info" | "success" | "warning" | "error" }> = {
  USERNAME_REQUIRED: {
    message: "Please enter your Roblox username below to begin the delivery process.",
    variant: "info",
  },
  PENDING: {
    message: "Username confirmed. Assigning your delivery bot…",
    variant: "info",
  },
  WAITING_FRIEND_REQUEST: {
    message: "Add the delivery bot as a Roblox friend, then click 'I Sent Friend Request' to continue.",
    variant: "info",
  },
  WAITING_JOIN: {
    message: "Friend request marked as sent. Join the private server to continue your delivery.",
    variant: "info",
  },
  QUEUED: {
    message: "Your delivery is queued. Keep this page open for live updates.",
    variant: "info",
  },
  PROCESSING: {
    message: "Your delivery is currently being processed by our team.",
    variant: "info",
  },
  DELIVERED: {
    message: "Delivery completed. Thank you for using RNGBLOX!",
    variant: "success",
  },
  FAILED: {
    message: "Delivery failed. Please contact support or wait for a retry.",
    variant: "error",
  },
  EXPIRED: {
    message: "This delivery session expired because the required steps were not completed in time. Please contact support.",
    variant: "warning",
  },
  SUPPORT_REQUIRED: {
    message: "This withdrawal requires customer service review for fraud protection. Our team will review it before delivery.",
    variant: "warning",
  },
};

function QueueBanner({ position, waitMinutes, status }: { position: number | null; waitMinutes: number | null; status: string }) {
  if (!["QUEUED", "WAITING_FRIEND_REQUEST", "WAITING_JOIN", "PROCESSING"].includes(status)) return null;
  if (!position && !waitMinutes) return null;

  return (
    <div className="flex items-center gap-4 rounded-rbx border border-rbx-blue/30 bg-rbx-blue/8 px-4 py-3">
      {position && position > 0 && (
        <div className="text-center min-w-[48px]">
          <p className="text-xl font-extrabold text-rbx-blue leading-none">#{position}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rbx-muted">Queue</p>
        </div>
      )}
      {position && position > 0 && waitMinutes && waitMinutes > 0 && (
        <div className="w-px h-8 bg-rbx-border" />
      )}
      {waitMinutes && waitMinutes > 0 && (
        <div className="text-center min-w-[48px]">
          <p className="text-xl font-extrabold text-rbx-blue leading-none">~{waitMinutes}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rbx-muted">Min Wait</p>
        </div>
      )}
      <p className="flex-1 text-sm text-rbx-muted">
        {status === "PROCESSING"
          ? "Your delivery is being processed right now."
          : waitMinutes && waitMinutes > 0
            ? `Estimated wait time based on current queue.`
            : "Your delivery is in the queue."}
      </p>
    </div>
  );
}

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
      if (!options?.silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/withdrawals/lookup/${encodeURIComponent(withdrawalCode)}`);
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
        if (!options?.silent) setLoading(false);
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
      // quiet
    }
  }, [data?.withdrawal.id]);

  useEffect(() => { refreshWithdrawal(); }, [refreshWithdrawal]);

  useEffect(() => {
    if (!data?.withdrawal.id) return;
    if (TERMINAL_STATUSES.has(data.withdrawal.status)) return;
    const interval = window.setInterval(() => { void pollWithdrawal(); }, 5000);
    return () => window.clearInterval(interval);
  }, [data?.withdrawal.id, data?.withdrawal.status, pollWithdrawal]);

  async function handleUsername(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/withdrawals/lookup/${encodeURIComponent(withdrawalCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robloxUsername: robloxUsername.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to save username"); return; }
      setData(json);
      if (json.startError) {
        const shortageText = Array.isArray(json.startShortages)
          ? json.startShortages
              .map((e: { name: string; required: number; available: number }) =>
                `${e.name}: need ${e.required}, available ${e.available}`)
              .join("; ")
          : null;
        setError(
          json.startHint ??
            (shortageText
              ? `${json.startError} (${shortageText})`
              : json.startError)
        );
      }
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
      const res = await fetch(`/api/withdrawals/${data.withdrawal.id}/start`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        const shortageText = Array.isArray(json.shortages)
          ? json.shortages
              .map((e: { name: string; required: number; available: number }) =>
                `${e.name}: need ${e.required}, available ${e.available}`)
              .join("; ")
          : null;
        // Build a user-friendly message
        let msg: string;
        if (json.error === "No bot available" || json.error === "Not enough bot inventory") {
          msg = json.hint ?? "No delivery bot is currently available for your game. Please contact support or try again shortly.";
          if (shortageText) msg += ` (${shortageText})`;
        } else {
          msg = json.hint ?? (shortageText ? `${json.error ?? "Failed"} (${shortageText})` : json.error ?? "Failed to start delivery");
        }
        setError(msg);
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
      const res = await fetch(`/api/withdrawals/${data.withdrawal.id}/friend-request-sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botAssignmentId: data.assignment.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to update friend request status"); return; }
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
      const res = await fetch(`/api/withdrawals/${data.withdrawal.id}/join-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botAssignmentId: data.assignment.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to join game"); return; }
      setData(json);
      const serverUrl = json.privateServerUrl ?? data.assignment.bot.privateServerUrl;
      if (serverUrl) window.open(serverUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <PageShell narrow>
        <div className="py-16 space-y-4">
          <div className="h-8 w-48 rounded-rbx bg-rbx-elevated animate-pulse mx-auto" />
          <div className="h-32 rounded-rbx bg-rbx-elevated animate-pulse" />
          <div className="h-48 rounded-rbx bg-rbx-elevated animate-pulse" />
        </div>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell narrow>
        <div className="py-12">{error && <Alert>{error}</Alert>}</div>
      </PageShell>
    );
  }

  const status = data.withdrawal.status;
  const isSupportRequired = status === "SUPPORT_REQUIRED";
  const needsUsername =
    !data.withdrawal.robloxUsername &&
    (status === "USERNAME_REQUIRED" || status === "PENDING");
  const canStart =
    (status === "PENDING" || status === "QUEUED") &&
    Boolean(data.withdrawal.robloxUsername) &&
    !data.assignment;

  const statusInfo = STATUS_MESSAGES[status];

  return (
    <PageShell narrow>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rbx-muted">Withdrawal</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-rbx-text">
                {data.withdrawal.withdrawalCode}
              </h1>
            </div>
            <Badge variant={statusToBadgeVariant(status)} className="text-sm px-3 py-1">
              {statusToLabel(status)}
            </Badge>
          </div>
          {/* Queue banner */}
          {(data.queuePosition ?? 0) > 0 && (
            <div className="mt-3">
              <QueueBanner
                position={data.queuePosition}
                waitMinutes={data.estimatedWaitMinutes}
                status={status}
              />
            </div>
          )}
        </div>

        {/* Status message */}
        {statusInfo && (
          <Alert variant={statusInfo.variant}>
            {statusInfo.message}
          </Alert>
        )}

        {/* Progress steps */}
        <Card title="Delivery Progress" elevated>
          <WithdrawalStepIndicator
            deliveryMethod={data.gameConfig?.deliveryMethod}
            withdrawalStatus={status}
            hasUsername={Boolean(data.withdrawal.robloxUsername)}
            hasAssignment={Boolean(data.assignment)}
            assignmentStatus={data.assignment?.status}
            deliveryJobStatus={data.deliveryJob?.status}
          />
        </Card>

        {/* Withdrawal details */}
        <Card title="Details" elevated>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="rbx-label">Status</dt>
              <dd className="mt-1">
                <Badge variant={statusToBadgeVariant(status)}>{statusToLabel(status)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="rbx-label">Total Value</dt>
              <dd className="mt-1 font-bold text-rbx-text">${data.withdrawal.totalValue.toFixed(2)}</dd>
            </div>
            {data.withdrawal.robloxUsername && (
              <div>
                <dt className="rbx-label">Roblox Username</dt>
                <dd className="mt-1 text-sm font-semibold text-rbx-text">{data.withdrawal.robloxUsername}</dd>
              </div>
            )}
            {data.game && (
              <div>
                <dt className="rbx-label">Game</dt>
                <dd className="mt-1 text-sm font-semibold text-rbx-text">{data.game.replace(/_/g, " ")}</dd>
              </div>
            )}
            {data.gameConfig?.deliveryMethod && (
              <div>
                <dt className="rbx-label">Method</dt>
                <dd className="mt-1 text-sm font-semibold text-rbx-text">
                  {data.gameConfig.deliveryMethod.replace(/_/g, " ")}
                </dd>
              </div>
            )}
          </dl>

          {/* Items */}
          <div className="rbx-divider mt-4 pt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rbx-muted">Items</p>
            <ul className="space-y-2">
              {data.items.map((item) => (
                <li key={item.id} className="rbx-list-row">
                  <div>
                    <span className="font-semibold text-rbx-text">{item.name}</span>
                    {item.rarity && (
                      <span className="ml-2 text-xs text-rbx-muted">{item.rarity}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-rbx-muted">${item.unitValue.toFixed(2)}</span>
                    <span className="font-bold text-rbx-blue">×{item.quantity}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Delivery instructions */}
        {!isSupportRequired && (
          <DeliveryInstructionsCard
            game={data.game}
            gameConfig={data.gameConfig}
            totalValue={data.withdrawal.totalValue}
          />
        )}

        {/* Username input */}
        {needsUsername && !isSupportRequired && (
          <Card title="Enter Your Roblox Username" elevated>
            <p className="mb-4 text-sm text-rbx-muted">
              We need your Roblox username to assign a delivery bot and start the process.
            </p>
            <form onSubmit={handleUsername} className="space-y-4">
              <Input
                label="Roblox Username"
                value={robloxUsername}
                onChange={(e) => setRobloxUsername(e.target.value)}
                placeholder="YourRobloxName"
                required
              />
              <Button type="submit" disabled={actionLoading} className="w-full" size="lg">
                {actionLoading ? "Saving…" : "Confirm Username →"}
              </Button>
            </form>
          </Card>
        )}

        {/* Start delivery */}
        {canStart && !isSupportRequired && (
          <Card title="Ready to Start Delivery" elevated>
            <p className="mb-4 text-sm text-rbx-muted">
              Username confirmed. Click below to be assigned a delivery bot from the queue.
            </p>
            {error && (
              <div className="mb-4">
                <Alert variant="error">{error}</Alert>
              </div>
            )}
            <Button
              type="button"
              disabled={actionLoading}
              onClick={handleStartWithdrawal}
              className="w-full"
              size="lg"
            >
              {actionLoading ? "Starting…" : "🚀 Start Delivery"}
            </Button>
          </Card>
        )}

        {/* MM2 delivery panel — rich flow for MM2 trading.
            Show MM2DeliveryPanel whenever game=MM2 and bot is assigned
            (with or without mm2Session — falls back to BotAssignmentCard only
             for non-MM2 games). */}
        {data.game === "MM2" && data.assignment ? (
          data.mm2Session ? (
            <MM2DeliveryPanel
              withdrawalId={data.withdrawal.id}
              assignment={data.assignment}
              mm2Session={data.mm2Session}
              withdrawalStatus={status}
              onUpdate={(json) => {
                if (json && typeof json === "object" && "withdrawal" in (json as object)) {
                  setData(json as WithdrawalData);
                  setRobloxUsername(
                    (json as WithdrawalData).withdrawal.robloxUsername ?? ""
                  );
                }
              }}
            />
          ) : (
            /* mm2Session not yet created — fall back to generic card but still
               show friend/join buttons via BotAssignmentCard */
            <BotAssignmentCard
              assignment={data.assignment}
              gameConfig={data.gameConfig}
              withdrawalStatus={status}
              onFriendRequestSent={handleFriendRequestSent}
              onJoinGame={handleJoinGame}
              actionLoading={actionLoading}
            />
          )
        ) : (
          data.assignment && (
            <BotAssignmentCard
              assignment={data.assignment}
              gameConfig={data.gameConfig}
              withdrawalStatus={status}
              onFriendRequestSent={handleFriendRequestSent}
              onJoinGame={handleJoinGame}
              actionLoading={actionLoading}
            />
          )
        )}

        {/* Delivery timeline */}
        <Card title="Delivery Timeline" elevated>
          <DeliveryTimeline logs={data.logs} />
        </Card>

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
