"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { useRouter } from "next/navigation";

interface MM2Session {
  id: string;
  status: string;
  customerRobloxUsername: string;
  privateServerUrl: string | null;
  customerJoinedAt: string | null;
  operatorReadyAt: string | null;
  tradeStartedAt: string | null;
  tradeCompletedAt: string | null;
  tradeFailedAt: string | null;
  statusMessage: { message: string; variant: string } | null;
}

interface MM2OperatorPanelProps {
  deliveryJobId: string;
  deliveryJobStatus: string;
  mm2Session: MM2Session;
  customerRobloxUsername: string | null;
  botProfileUrl: string;
  botUsername: string;
  privateServerUrl: string | null;
  items: Array<{ name: string; quantity: number }>;
}

const SESSION_STATUS_LABELS: Record<string, string> = {
  WAITING_FRIEND: "Waiting for Friend Request",
  WAITING_CUSTOMER_JOIN: "Waiting for Customer to Join",
  CUSTOMER_IN_SERVER: "Customer In Server",
  OPERATOR_READY: "Operator Ready",
  TRADE_SENT: "Trade Sent",
  TRADE_ACCEPTED: "Trade Accepted",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  EXPIRED: "Expired",
};

const SESSION_STATUS_COLORS: Record<string, string> = {
  WAITING_FRIEND: "warning",
  WAITING_CUSTOMER_JOIN: "warning",
  CUSTOMER_IN_SERVER: "info",
  OPERATOR_READY: "info",
  TRADE_SENT: "info",
  TRADE_ACCEPTED: "success",
  DELIVERED: "success",
  FAILED: "danger",
  EXPIRED: "warning",
};

function waitingMinutes(timestamp: string | null): number {
  if (!timestamp) return 0;
  return Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
}

function WaitBadge({ since, label }: { since: string | null; label: string }) {
  if (!since) return null;
  const mins = waitingMinutes(since);
  const color =
    mins >= 15 ? "bg-red-100 text-red-700" :
    mins >= 5 ? "bg-yellow-100 text-yellow-700" :
    "bg-green-100 text-green-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold ${color}`}>
      {label} {mins}m ago
    </span>
  );
}

export function MM2OperatorPanel({
  mm2Session,
  customerRobloxUsername,
  botProfileUrl,
  botUsername,
  privateServerUrl,
  items,
}: MM2OperatorPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failReason, setFailReason] = useState("");

  const sessionId = mm2Session.id;
  const sessionStatus = mm2Session.status;
  const isTerminal =
    sessionStatus === "DELIVERED" ||
    sessionStatus === "FAILED" ||
    sessionStatus === "EXPIRED";

  async function callAction(action: string, body?: Record<string, string>) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mm2-sessions/${sessionId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Failed to ${action.replace(/-/g, " ")}`);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const serverUrl = mm2Session.privateServerUrl ?? privateServerUrl;

  return (
    <Card title="MM2 Operator Panel" elevated>
      {/* Session status */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge
          variant={
            (SESSION_STATUS_COLORS[sessionStatus] as
              | "success"
              | "danger"
              | "warning"
              | "info"
              | "pending") ?? "pending"
          }
        >
          {SESSION_STATUS_LABELS[sessionStatus] ?? sessionStatus}
        </Badge>
        {mm2Session.customerJoinedAt && sessionStatus === "CUSTOMER_IN_SERVER" && (
          <WaitBadge since={mm2Session.customerJoinedAt} label="Customer joined" />
        )}
        {sessionStatus === "WAITING_CUSTOMER_JOIN" && (
          <WaitBadge since={mm2Session.operatorReadyAt} label="Waiting" />
        )}
      </div>

      {/* Key info */}
      <dl className="mb-5 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="rbx-label">Customer Roblox Username</dt>
          <dd className="mt-1 font-bold text-rbx-text text-lg">
            {customerRobloxUsername ?? mm2Session.customerRobloxUsername ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="rbx-label">Assigned Bot</dt>
          <dd className="mt-1">
            <a
              href={botProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-rbx-blue hover:underline"
            >
              {botUsername}
            </a>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="rbx-label">MM2 Private Server</dt>
          <dd className="mt-1">
            {serverUrl ? (
              <a
                href={serverUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-rbx bg-rbx-green/10 px-3 py-1.5 text-sm font-bold text-rbx-green hover:bg-rbx-green/20 transition-colors"
              >
                🎮 Open MM2 Private Server
              </a>
            ) : (
              <span className="text-rbx-muted text-sm">No private server URL set on bot.</span>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="rbx-label">Items to Trade</dt>
          <dd className="mt-1">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.name} className="flex items-center justify-between rounded-rbx border border-rbx-border px-3 py-1.5 text-sm">
                  <span className="font-medium text-rbx-text">{item.name}</span>
                  <span className="font-bold text-rbx-blue">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      {/* Operator checklist */}
      <div className="mb-5 rounded-rbx border border-rbx-border bg-rbx-panel p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-rbx-muted">
          Operator Checklist
        </p>
        <ol className="space-y-2">
          {[
            "Login to the assigned Roblox bot account manually.",
            "Open MM2 (Murder Mystery 2).",
            "Join the private server link shown above.",
            `Find the customer "${customerRobloxUsername ?? mm2Session.customerRobloxUsername}" in the lobby.`,
            "Send a trade request to that exact username.",
            "Add the exact listed items to the trade.",
            "Confirm the trade.",
            "Click 'Mark Trade Sent' then 'Mark Delivered' below.",
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

      {/* Session timestamps */}
      {(mm2Session.customerJoinedAt ||
        mm2Session.operatorReadyAt ||
        mm2Session.tradeStartedAt) && (
        <div className="mb-4 rounded-rbx bg-rbx-elevated px-3 py-2 text-xs text-rbx-muted space-y-1">
          {mm2Session.customerJoinedAt && (
            <p>
              Customer joined server:{" "}
              {new Date(mm2Session.customerJoinedAt).toLocaleString()}
            </p>
          )}
          {mm2Session.operatorReadyAt && (
            <p>
              Operator ready:{" "}
              {new Date(mm2Session.operatorReadyAt).toLocaleString()}
            </p>
          )}
          {mm2Session.tradeStartedAt && (
            <p>
              Trade sent:{" "}
              {new Date(mm2Session.tradeStartedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Action buttons */}
      {!isTerminal && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* Mark Operator Ready */}
            <Button
              size="sm"
              variant="secondary"
              disabled={
                !!loading ||
                sessionStatus === "OPERATOR_READY" ||
                sessionStatus === "TRADE_SENT" ||
                sessionStatus === "TRADE_ACCEPTED"
              }
              onClick={() => callAction("operator-ready")}
            >
              {loading === "operator-ready"
                ? "..."
                : sessionStatus === "OPERATOR_READY" ||
                  sessionStatus === "TRADE_SENT"
                ? "✓ Operator Ready"
                : "Mark Operator Ready"}
            </Button>

            {/* Mark Customer Found */}
            <Button
              size="sm"
              variant="secondary"
              disabled={
                !!loading ||
                sessionStatus === "TRADE_SENT" ||
                sessionStatus === "TRADE_ACCEPTED"
              }
              onClick={() => callAction("customer-found")}
            >
              {loading === "customer-found" ? "..." : "Mark Customer Found"}
            </Button>

            {/* Mark Trade Sent */}
            <Button
              size="sm"
              variant="primary"
              disabled={
                !!loading ||
                sessionStatus === "TRADE_SENT" ||
                sessionStatus === "TRADE_ACCEPTED"
              }
              onClick={() => callAction("trade-sent")}
            >
              {loading === "trade-sent"
                ? "..."
                : sessionStatus === "TRADE_SENT"
                ? "✓ Trade Sent"
                : "Mark Trade Sent"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Mark Delivered */}
            <Button
              size="sm"
              variant="success"
              disabled={!!loading}
              onClick={() => callAction("trade-completed")}
            >
              {loading === "trade-completed" ? "Marking…" : "✅ Mark Delivered"}
            </Button>

            {/* Mark Failed */}
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Fail reason (optional)"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                className="rounded-rbx border border-rbx-border bg-rbx-panel px-3 py-1.5 text-sm text-rbx-text placeholder:text-rbx-muted focus:outline-none focus:ring-2 focus:ring-rbx-red/40 w-52"
              />
              <Button
                size="sm"
                variant="danger"
                disabled={!!loading}
                onClick={() =>
                  callAction("trade-failed", { reason: failReason })
                }
              >
                {loading === "trade-failed" ? "Marking…" : "✗ Mark Failed"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isTerminal && (
        <p className="text-sm text-rbx-muted">
          This MM2 session is closed (
          {SESSION_STATUS_LABELS[sessionStatus] ?? sessionStatus}).
        </p>
      )}
    </Card>
  );
}
