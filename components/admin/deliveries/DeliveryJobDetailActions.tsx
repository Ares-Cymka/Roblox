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
    action: "mark-delivered" | "mark-failed" | "retry",
    body?: Record<string, string>
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

  const canMarkDelivered = ["QUEUED", "PROCESSING", "WAITING_USER", "RETRYING"].includes(
    status
  );
  const canMarkFailed = status !== "DELIVERED" && status !== "FAILED";
  const canRetry = status === "FAILED";

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
            {loading === "retry" ? "Retrying..." : "Retry Failed"}
          </Button>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
