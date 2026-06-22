"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

interface SupportReviewActionsProps {
  withdrawalId: string;
  status: string;
}

export function SupportReviewActions({
  withdrawalId,
  status,
}: SupportReviewActionsProps) {
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isReviewable = status === "SUPPORT_REQUIRED";

  async function runAction(action: "approve" | "reject" | "note", body?: Record<string, string>) {
    setLoading(action);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/support/${withdrawalId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Action failed");
        return;
      }

      if (action === "note") {
        setNoteText("");
        setSuccess("Note added.");
        router.refresh();
      } else {
        router.push("/admin/support");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    const reason = window.prompt(
      "Enter rejection reason:",
      "Withdrawal did not pass fraud review."
    );
    if (!reason?.trim()) return;
    await runAction("reject", { reason: reason.trim() });
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    await runAction("note", { note: noteText.trim() });
  }

  return (
    <div className="space-y-5">
      {isReviewable && (
        <Card title="Review Actions" elevated>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              disabled={loading !== null}
              onClick={() => runAction("approve")}
            >
              {loading === "approve" ? "Approving..." : "Approve for Delivery"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={loading !== null}
              onClick={handleReject}
            >
              {loading === "reject" ? "Rejecting..." : "Reject Withdrawal"}
            </Button>
          </div>
          {error && <Alert className="mt-3">{error}</Alert>}
          {success && (
            <Alert variant="success" className="mt-3">
              {success}
            </Alert>
          )}
        </Card>
      )}

      <Card title="Add Note" elevated>
        <form onSubmit={handleAddNote} className="space-y-3">
          <Input
            label="Note"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add internal support note..."
            required
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={loading !== null || !noteText.trim()}
          >
            {loading === "note" ? "Saving..." : "Add Note"}
          </Button>
          {!error && success && (
            <Alert variant="success">{success}</Alert>
          )}
          {error && loading === null && <Alert>{error}</Alert>}
        </form>
      </Card>
    </div>
  );
}
