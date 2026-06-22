"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface FillTestStockButtonProps {
  botId: string;
}

export function FillTestStockButton({ botId }: FillTestStockButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFill() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/admin/bots/${botId}/inventory/fill-test-stock`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to fill test stock");
        return;
      }

      setMessage(data.message ?? "Test stock updated.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" disabled={loading} onClick={handleFill}>
        {loading ? "Updating..." : "Fill test stock (qty 10)"}
      </Button>
      <p className="text-xs text-gray-500">
        Sets each linked inventory item to at least 10 available units for delivery testing.
      </p>
      {message && <p className="text-sm font-semibold text-rbx-green">{message}</p>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
