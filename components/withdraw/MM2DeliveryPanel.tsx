"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";

interface MM2Session {
  id: string;
  status: string;
  customerRobloxUsername: string;
  privateServerUrl: string | null;
  customerJoinedAt: string | null;
  operatorReadyAt: string | null;
  tradeStartedAt: string | null;
  tradeCompletedAt: string | null;
  statusMessage: { message: string; variant: "info" | "success" | "warning" | "error" } | null;
}

interface Assignment {
  id: string;
  status: string;
  bot: {
    robloxUsername: string;
    profileUrl: string;
    privateServerUrl: string | null;
  };
  assignedItems: Array<{ productId: string; name: string; quantity: number }>;
}

interface MM2DeliveryPanelProps {
  withdrawalId: string;
  assignment: Assignment;
  mm2Session: MM2Session;
  withdrawalStatus: string;
  onUpdate: (data: unknown) => void;
}

// Visible step indicator for MM2 flow
const STEPS = [
  { key: "username", label: "Username" },
  { key: "bot_assigned", label: "Bot Assigned" },
  { key: "add_friend", label: "Add Friend" },
  { key: "join_server", label: "Join Server" },
  { key: "in_server", label: "In Server" },
  { key: "trade", label: "Trade" },
  { key: "delivered", label: "Delivered" },
] as const;

function getActiveStep(sessionStatus: string, withdrawalStatus: string): number {
  // One past the last step so "Delivered" shows a green check, not blue "active".
  if (withdrawalStatus === "DELIVERED" || sessionStatus === "DELIVERED") {
    return STEPS.length + 1;
  }
  if (sessionStatus === "TRADE_SENT" || sessionStatus === "TRADE_ACCEPTED") return 5;
  if (
    sessionStatus === "CUSTOMER_IN_SERVER" ||
    sessionStatus === "OPERATOR_READY"
  )
    return 4;
  if (withdrawalStatus === "WAITING_JOIN") return 3;
  if (withdrawalStatus === "WAITING_FRIEND_REQUEST") return 2;
  if (withdrawalStatus === "QUEUED") return 2;
  return 1;
}

function MM2Steps({
  sessionStatus,
  withdrawalStatus,
}: {
  sessionStatus: string;
  withdrawalStatus: string;
}) {
  const active = getActiveStep(sessionStatus, withdrawalStatus);
  const failed =
    sessionStatus === "FAILED" ||
    withdrawalStatus === "FAILED" ||
    withdrawalStatus === "EXPIRED";

  return (
    <>
      {/* Desktop: horizontal stepper with connectors aligned to circles */}
      <div className="hidden w-full sm:flex">
        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const done = stepNum < active;
          const current = stepNum === active;
          const isFailed = failed && current;
          const isLast = index === STEPS.length - 1;

          return (
            <div
              key={step.key}
              className={cn(
                "flex min-w-0 flex-col items-center",
                !isLast && "flex-1"
              )}
            >
              <div
                className={cn(
                  "flex w-full items-center",
                  isLast && "justify-center"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done
                      ? "bg-rbx-green text-white"
                      : isFailed
                        ? "bg-rbx-red text-white"
                        : current
                          ? "bg-rbx-blue text-white ring-2 ring-rbx-blue/30"
                          : "bg-rbx-elevated text-rbx-muted"
                  )}
                >
                  {done ? "✓" : isFailed ? "✗" : stepNum}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 flex-1 self-center",
                      done ? "bg-rbx-green" : "bg-rbx-elevated"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-1 max-w-[64px] text-center text-[11px] font-semibold leading-tight",
                  done || current ? "text-rbx-text" : "text-rbx-muted"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="flex flex-col gap-3 sm:hidden">
        {STEPS.map((step, index) => {
          const stepNum = index + 1;
          const done = stepNum < active;
          const current = stepNum === active;
          const isFailed = failed && current;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done
                      ? "bg-rbx-green text-white"
                      : isFailed
                        ? "bg-rbx-red text-white"
                        : current
                          ? "bg-rbx-blue text-white ring-2 ring-rbx-blue/30"
                          : "bg-rbx-elevated text-rbx-muted"
                  )}
                >
                  {done ? "✓" : isFailed ? "✗" : stepNum}
                </div>
                {!isLast && <div className="mt-1 h-5 w-0.5 bg-rbx-border" />}
              </div>
              <span
                className={cn(
                  "pt-0.5 text-sm font-semibold",
                  done || current ? "text-rbx-text" : "text-rbx-muted"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function MM2DeliveryPanel({
  withdrawalId,
  assignment,
  mm2Session,
  withdrawalStatus,
  onUpdate,
}: MM2DeliveryPanelProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinClicked, setJoinClicked] = useState(false);

  const sessionStatus = mm2Session.status;
  const botUsername = assignment.bot.robloxUsername;
  const privateServerUrl =
    mm2Session.privateServerUrl ?? assignment.bot.privateServerUrl;

  // Button enablement rules
  const canFriendRequest =
    withdrawalStatus === "WAITING_FRIEND_REQUEST" ||
    assignment.status === "FRIEND_REQUEST_PENDING";

  const friendRequestDone =
    assignment.status === "FRIEND_REQUEST_SENT" ||
    assignment.status === "READY_TO_JOIN" ||
    assignment.status === "IN_GAME" ||
    assignment.status === "DELIVERING" ||
    assignment.status === "COMPLETED" ||
    withdrawalStatus === "WAITING_JOIN" ||
    withdrawalStatus === "QUEUED" ||
    withdrawalStatus === "PROCESSING" ||
    withdrawalStatus === "DELIVERED";

  const canJoin =
    friendRequestDone &&
    (withdrawalStatus === "WAITING_JOIN" ||
      withdrawalStatus === "QUEUED" ||
      withdrawalStatus === "PROCESSING");

  const joinDone =
    joinClicked ||
    sessionStatus === "CUSTOMER_IN_SERVER" ||
    sessionStatus === "OPERATOR_READY" ||
    sessionStatus === "TRADE_SENT" ||
    sessionStatus === "TRADE_ACCEPTED" ||
    sessionStatus === "DELIVERED";

  const canMarkInServer =
    (joinDone || joinClicked) &&
    !["CUSTOMER_IN_SERVER", "OPERATOR_READY", "TRADE_SENT", "TRADE_ACCEPTED", "DELIVERED", "FAILED", "EXPIRED"].includes(
      sessionStatus
    );

  const isTerminal =
    withdrawalStatus === "DELIVERED" ||
    withdrawalStatus === "FAILED" ||
    withdrawalStatus === "CANCELLED" ||
    withdrawalStatus === "EXPIRED";

  async function handleFriendRequestSent() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/withdrawals/${withdrawalId}/friend-request-sent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botAssignmentId: assignment.id }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to mark friend request");
        return;
      }
      onUpdate(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleJoinServer() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/withdrawals/${withdrawalId}/join-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botAssignmentId: assignment.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to start join game");
        return;
      }
      onUpdate(json);
      setJoinClicked(true);
      const url = json.privateServerUrl ?? privateServerUrl;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInServer() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/withdrawals/${withdrawalId}/customer-in-server`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botAssignmentId: assignment.id }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to notify server");
        return;
      }
      onUpdate(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  const mm2StatusInfo = mm2Session.statusMessage;

  return (
    <Card title="MM2 Delivery Instructions" elevated>
      {/* Progress steps */}
      <div className="mb-5">
        <MM2Steps sessionStatus={sessionStatus} withdrawalStatus={withdrawalStatus} />
      </div>

      {/* MM2 session status */}
      {mm2StatusInfo && (
        <div className="mb-4">
          <Alert variant={mm2StatusInfo.variant}>{mm2StatusInfo.message}</Alert>
        </div>
      )}

      {/* Bot info */}
      <div className="mb-5 rounded-rbx border border-rbx-border bg-rbx-panel p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rbx-blue/20 text-lg font-extrabold text-rbx-blue">
            {botUsername.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-rbx-text">{botUsername}</p>
            <p className="text-xs text-rbx-muted">MM2 Delivery Bot</p>
          </div>
          <Badge variant="info" className="text-xs">
            MM2
          </Badge>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-rbx-muted">Your username</span>
            <span className="font-semibold text-rbx-text">
              {mm2Session.customerRobloxUsername}
            </span>
          </div>
          {assignment.assignedItems.map((item) => (
            <div key={item.productId} className="flex justify-between">
              <span className="text-rbx-muted">{item.name}</span>
              <span className="font-bold text-rbx-blue">×{item.quantity}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={assignment.bot.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-rbx bg-rbx-blue/10 px-3 py-1.5 text-xs font-bold text-rbx-blue hover:bg-rbx-blue/20 transition-colors"
          >
            🔗 Bot Profile
          </a>
          {privateServerUrl && (
            <a
              href={privateServerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-rbx bg-rbx-green/10 px-3 py-1.5 text-xs font-bold text-rbx-green hover:bg-rbx-green/20 transition-colors"
            >
              🎮 MM2 Private Server
            </a>
          )}
        </div>
      </div>

      {/* Step-by-step instructions */}
      {!isTerminal && (
        <div className="mb-5 rounded-rbx border border-rbx-border bg-rbx-panel p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-rbx-muted">
            Follow These Steps
          </p>
          <ol className="space-y-2">
            {[
              "Add the delivery bot as a Roblox friend using the 'Add Bot' button.",
              "Click 'I Sent Friend Request' once you have sent the request.",
              "Click 'Join MM2 Server' to open the bot's private server.",
              "Stay in the MM2 lobby after joining — do not wander off.",
              "Click 'I Am In Server' to notify the operator you have joined.",
              "Wait for a trade request from the assigned bot username.",
              `Only accept the trade from ${botUsername} — reject all others.`,
              "Keep this page open until delivery is confirmed.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-rbx-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rbx-blue/20 text-[10px] font-bold text-rbx-blue">
                  {i + 1}
                </span>
                <span className="pt-px leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Action buttons */}
      {!isTerminal && (
        <div className="flex flex-wrap gap-3">
          {/* Add Bot */}
          <a
            href={assignment.bot.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-rbx bg-rbx-blue px-4 py-2 text-sm font-bold text-white hover:bg-rbx-blue/90 transition-colors"
          >
            👤 Add Bot
          </a>

          {/* I Sent Friend Request */}
          <Button
            variant={friendRequestDone ? "secondary" : "primary"}
            size="sm"
            disabled={actionLoading || friendRequestDone || !canFriendRequest}
            onClick={handleFriendRequestSent}
          >
            {friendRequestDone ? "✓ Friend Request Sent" : "✋ I Sent Friend Request"}
          </Button>

          {/* Join MM2 Server */}
          <Button
            variant={joinDone ? "secondary" : "success"}
            size="sm"
            disabled={actionLoading || joinDone || !canJoin}
            onClick={handleJoinServer}
          >
            {joinDone ? "✓ Joined Server" : "🎮 Join MM2 Server"}
          </Button>

          {/* I Am In Server */}
          <Button
            variant={
              sessionStatus === "CUSTOMER_IN_SERVER" ||
              sessionStatus === "OPERATOR_READY" ||
              sessionStatus === "TRADE_SENT"
                ? "secondary"
                : "pending"
            }
            size="sm"
            disabled={
              actionLoading ||
              !canMarkInServer ||
              sessionStatus === "CUSTOMER_IN_SERVER" ||
              sessionStatus === "OPERATOR_READY" ||
              sessionStatus === "TRADE_SENT" ||
              sessionStatus === "TRADE_ACCEPTED" ||
              sessionStatus === "DELIVERED"
            }
            onClick={handleInServer}
          >
            {sessionStatus === "CUSTOMER_IN_SERVER" ||
            sessionStatus === "OPERATOR_READY" ||
            sessionStatus === "TRADE_SENT" ||
            sessionStatus === "TRADE_ACCEPTED"
              ? "✓ In Server"
              : "📍 I Am In Server"}
          </Button>
        </div>
      )}

      {/* Timestamp info */}
      {(mm2Session.customerJoinedAt || mm2Session.tradeStartedAt) && (
        <div className="mt-4 rounded-rbx bg-rbx-elevated px-3 py-2 text-xs text-rbx-muted space-y-1">
          {mm2Session.customerJoinedAt && (
            <p>
              Joined server:{" "}
              {new Date(mm2Session.customerJoinedAt).toLocaleTimeString()}
            </p>
          )}
          {mm2Session.tradeStartedAt && (
            <p>
              Trade sent:{" "}
              {new Date(mm2Session.tradeStartedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
