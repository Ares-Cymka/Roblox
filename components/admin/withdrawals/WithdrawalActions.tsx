"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface WithdrawalActionsProps {
  withdrawalId: string;
  status: string;
}

export function WithdrawalActions({
  withdrawalId,
  status,
}: WithdrawalActionsProps) {
  const router = useRouter();

  async function runAction(action: "approve_support" | "cancel") {
    const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <div className="flex gap-2">
      {status === "SUPPORT_REQUIRED" && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => runAction("approve_support")}
        >
          Approve
        </Button>
      )}
      {status !== "DELIVERED" && status !== "CANCELLED" && (
        <Button type="button" variant="ghost" onClick={() => runAction("cancel")}>
          Cancel
        </Button>
      )}
    </div>
  );
}
