"use client";

import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

interface ClaimItem {
  id: string;
  name: string;
  game: string;
  quantity: number;
  rarity: string | null;
}

interface ClaimLookupResult {
  claim: {
    claimCode: string;
    status: string;
    robloxUsername: string | null;
  };
  order: {
    orderCode: string;
    status: string;
    game: string | null;
  };
  items: ClaimItem[];
}

type Step = "lookup" | "details" | "done";

export default function ClaimPage() {
  const [step, setStep] = useState<Step>("lookup");
  const [claimCode, setClaimCode] = useState("");
  const [robloxUsername, setRobloxUsername] = useState("");
  const [result, setResult] = useState<ClaimLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/claims/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimCode: claimCode.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to look up claim code");
        return;
      }

      setResult(data);
      setRobloxUsername(data.claim.robloxUsername ?? "");
      setStep("details");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleContinue(e: FormEvent) {
    e.preventDefault();
    if (!result) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/claims/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimCode: result.claim.claimCode,
          robloxUsername: robloxUsername.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to continue claim");
        return;
      }

      setResult(data);
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function resetFlow() {
    setStep("lookup");
    setClaimCode("");
    setRobloxUsername("");
    setResult(null);
    setError(null);
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Claim Delivery</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your claim code to view your order and link your Roblox account.
          </p>
        </div>

        {step === "lookup" && (
          <Card>
            <form onSubmit={handleLookup} className="space-y-4">
              <Input
                label="Claim Code"
                placeholder="e.g. ABC12345"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                required
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Looking up..." : "Look Up Claim"}
              </Button>
            </form>
          </Card>
        )}

        {step !== "lookup" && result && (
          <>
            <Card title="Your Order">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Order Code</dt>
                  <dd className="font-mono font-medium">{result.order.orderCode}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Claim Code</dt>
                  <dd className="font-mono font-medium">{result.claim.claimCode}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <Badge variant={statusToBadgeVariant(result.claim.status)}>
                      {result.claim.status.replace(/_/g, " ")}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="mb-3 text-sm font-medium text-gray-900">Items</p>
                <ul className="space-y-2">
                  {result.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-brand-bg/50 px-3 py-2 text-sm"
                    >
                      <span>
                        {item.name}
                        {item.rarity ? (
                          <span className="text-gray-500"> · {item.rarity}</span>
                        ) : null}
                      </span>
                      <span className="font-medium">× {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {step === "details" && (
              <Card title="Link Roblox Account">
                <form onSubmit={handleContinue} className="space-y-4">
                  <Input
                    label="Roblox Username"
                    placeholder="Your in-game username"
                    value={robloxUsername}
                    onChange={(e) => setRobloxUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Saving..." : "Continue"}
                  </Button>
                </form>
              </Card>
            )}

            {step === "done" && (
              <Alert variant="info">
                Username linked. Your claim status is now{" "}
                <span className="font-semibold">
                  {result.claim.status.replace(/_/g, " ")}
                </span>
                . Delivery will continue from here.
              </Alert>
            )}

            <Button type="button" variant="ghost" className="w-full" onClick={resetFlow}>
              Start Over
            </Button>
          </>
        )}

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
