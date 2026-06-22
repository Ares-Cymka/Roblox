"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface DeliveryJobDetailActionsProps {
  deliveryJobId: string;
  status: string;
}

export function DeliveryJobDetailActions({
  deliveryJobId,
  status,
}: DeliveryJobDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    action: string,
    body?: Record<string, string | number>
  ) {
    setLoading(action);
    setError(null);

    try {
      const res = await fetch(`/api/admin/deliveries/${deliveryJobId}/${action}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Action failed");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleMarkFailed() {
    const reason = window.prompt(
      "Enter failure reason for this delivery:",
      "Manual operator failure"
    );
    if (!reason?.trim()) return;
    await runAction("mark-failed", { reason: reason.trim() });
  }

  async function handleRetryLater() {
    const reason = window.prompt("Enter reason for delayed retry:", "Will retry later");
    if (!reason?.trim()) return;
    const minutesStr = window.prompt("Retry after how many minutes?", "15");
    const minutes = parseInt(minutesStr ?? "", 10);
    if (!minutes || minutes < 1) return;
    await runAction("retry-later", { reason: reason.trim(), retryAfterMinutes: minutes });
  }

  async function handleReassign() {
    if (!window.confirm("Find a different available bot and reassign this delivery?")) return;
    await runAction("reassign");
  }

  async function handleExpire() {
    if (!window.confirm("Expire this withdrawal? The customer will need to create a new withdrawal.")) return;
    await runAction("expire");
  }

  const canMarkDelivered = ["QUEUED", "PROCESSING", "WAITING_USER", "RETRYING"].includes(status);
  const canMarkFailed = status !== "DELIVERED" && status !== "FAILED" && status !== "CANCELLED";
  const canRetry = status === "FAILED";
  const canRetryLater = status !== "DELIVERED" && status !== "CANCELLED";
  const canReassign = status !== "DELIVERED" && status !== "CANCELLED";
  const canExpire = status === "WAITING_USER";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {canMarkDelivered && (
          <Button
            type="button"
            size="lg"
            disabled={loading !== null}
            onClick={() => runAction("mark-delivered")}
          >
            {loading === "mark-delivered" ? "Saving..." : "Mark Delivered"}
          </Button>
        )}
        {canMarkFailed && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={loading !== null}
            onClick={handleMarkFailed}
          >
            {loading === "mark-failed" ? "Saving..." : "Mark Failed"}
          </Button>
        )}
        {canRetry && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={loading !== null}
            onClick={() => runAction("retry")}
          >
            {loading === "retry" ? "Retrying..." : "Retry Now"}
          </Button>
        )}
        {canRetryLater && (
          <Button
            type="button"
            variant="secondary"
            disabled={loading !== null}
            onClick={handleRetryLater}
          >
            {loading === "retry-later" ? "Scheduling..." : "Retry Later"}
          </Button>
        )}
        {canReassign && (
          <Button
            type="button"
            variant="ghost"
            disabled={loading !== null}
            onClick={handleReassign}
          >
            {loading === "reassign" ? "Reassigning..." : "Reassign Bot"}
          </Button>
        )}
        {canExpire && (
          <Button
            type="button"
            variant="ghost"
            disabled={loading !== null}
            onClick={handleExpire}
          >
            {loading === "expire" ? "Expiring..." : "Expire Now"}
          </Button>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
