"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface SyncBotCatalogButtonProps {
  botId: string;
  productCount: number;
}

export function SyncBotCatalogButton({
  botId,
  productCount,
}: SyncBotCatalogButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/bots/${botId}/inventory/sync-catalog`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to sync catalog");
        return;
      }

      setMessage(
        `Synced ${data.linked} product(s). Zero-stock items were set to ${data.defaultQuantity ?? 10}.`
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={loading || productCount === 0}
        onClick={handleSync}
      >
        {loading ? "Syncing..." : `Sync all ${productCount} catalog product(s)`}
      </Button>
      {productCount === 0 && (
        <p className="text-xs text-gray-500">Import products for this game first.</p>
      )}
      {message && <p className="text-sm font-semibold text-rbx-green">{message}</p>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
