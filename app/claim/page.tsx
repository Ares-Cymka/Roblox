"use client";

import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

interface DeliveryInfo {
  claimCode: string;
  productName: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export default function ClaimPage() {
  const [claimCode, setClaimCode] = useState("");
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDelivery(null);

    try {
      const res = await fetch(`/api/claim?code=${encodeURIComponent(claimCode.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to look up claim code");
        return;
      }

      setDelivery(data.delivery);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Claim Delivery</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your claim code to check your delivery status.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Claim Code"
              placeholder="e.g. ABC12345"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Looking up..." : "Check Status"}
            </Button>
          </form>
        </Card>

        {error && <Alert>{error}</Alert>}

        {delivery && (
          <Card title="Delivery Status">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Product</dt>
                <dd className="font-medium">{delivery.productName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Claim Code</dt>
                <dd className="font-mono font-medium">{delivery.claimCode}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <Badge variant={statusToBadgeVariant(delivery.status)}>
                    {delivery.status}
                  </Badge>
                </dd>
              </div>
              {delivery.error && (
                <div>
                  <dt className="text-gray-500">Error</dt>
                  <dd className="mt-1 text-brand-warning">{delivery.error}</dd>
                </div>
              )}
            </dl>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
