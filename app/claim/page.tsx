"use client";

import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { BotAssignmentCard } from "@/components/claim/BotAssignmentCard";

interface ClaimItem {
  id: string;
  name: string;
  game: string;
  quantity: number;
  rarity: string | null;
}

interface BotAssignment {
  id: string;
  status: string;
  bot: {
    robloxUsername: string;
    profileUrl: string;
    privateServerUrl: string | null;
  };
  assignedItems: Array<{
    productId: string;
    name: string;
    quantity: number;
  }>;
}

interface ClaimLookupResult {
  claim: {
    id: string;
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
  assignment: BotAssignment | null;
  deliveryJob: { status: string } | null;
}

function isUsernameLinked(status: string): boolean {
  return status !== "PENDING";
}

function hasStartedClaim(result: ClaimLookupResult): boolean {
  return Boolean(result.assignment);
}

export default function ClaimPage() {
  const [step, setStep] = useState<"lookup" | "active">("lookup");
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
      setStep("active");
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
      setRobloxUsername(data.claim.robloxUsername ?? robloxUsername.trim());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartClaim() {
    if (!result) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims/${result.claim.id}/start`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        const shortageText = Array.isArray(data.shortages)
          ? data.shortages
              .map(
                (entry: { name: string; required: number; available: number }) =>
                  `${entry.name}: need ${entry.required}, bot has ${entry.available}`
              )
              .join("; ")
          : null;

        setError(
          shortageText
            ? `${data.error ?? "Failed to start claim"} (${shortageText})`
            : data.error ?? "Failed to start claim"
        );
        return;
      }

      setResult(data);
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

  const usernameLinked = result ? isUsernameLinked(result.claim.status) : false;
  const claimStarted = result ? hasStartedClaim(result) : false;
  const canStartClaim =
    result &&
    usernameLinked &&
    !claimStarted &&
    (result.claim.status === "USERNAME_LINKED" || result.claim.status === "PENDING");

  return (
    <PageShell narrow>
      <PageHeader
        title="Claim Delivery"
        description="Enter your claim code, link your Roblox account, and start delivery."
      />

      <div className="space-y-6">
        {step === "lookup" && (
          <Card elevated>
            <form onSubmit={handleLookup} className="space-y-4">
              <Input
                label="Claim Code"
                placeholder="e.g. ABC12345"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                required
              />
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Looking up..." : "Look Up Claim"}
              </Button>
            </form>
          </Card>
        )}

        {step === "active" && result && (
          <>
            <Card title="Your Order" elevated>
              <dl className="space-y-3">
                <div className="flex justify-between gap-4">
                  <dt className="rbx-label">Order Code</dt>
                  <dd className="font-mono text-sm font-bold text-rbx-text">
                    {result.order.orderCode}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="rbx-label">Claim Code</dt>
                  <dd className="font-mono text-sm font-bold text-rbx-text">
                    {result.claim.claimCode}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="rbx-label">Status</dt>
                  <dd>
                    <Badge variant={statusToBadgeVariant(result.claim.status)}>
                      {result.claim.status.replace(/_/g, " ")}
                    </Badge>
                  </dd>
                </div>
                {result.claim.robloxUsername && (
                  <div className="flex justify-between gap-4">
                    <dt className="rbx-label">Roblox Username</dt>
                    <dd className="rbx-value">{result.claim.robloxUsername}</dd>
                  </div>
                )}
              </dl>

              <div className="rbx-divider mt-5 pt-4">
                <p className="mb-3 text-sm font-bold text-rbx-text">Items</p>
                <ul className="space-y-2">
                  {result.items.map((item) => (
                    <li key={item.id} className="rbx-list-row">
                      <span>
                        {item.name}
                        {item.rarity ? (
                          <span className="text-rbx-dim"> · {item.rarity}</span>
                        ) : null}
                      </span>
                      <span className="font-bold text-rbx-green">x {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {!usernameLinked && (
              <Card title="Link Roblox Account" elevated>
                <form onSubmit={handleContinue} className="space-y-4">
                  <Input
                    label="Roblox Username"
                    placeholder="Your in-game username"
                    value={robloxUsername}
                    onChange={(e) => setRobloxUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? "Saving..." : "Continue"}
                  </Button>
                </form>
              </Card>
            )}

            {usernameLinked && !claimStarted && (
              <Card title="Start Delivery" elevated>
                <p className="mb-4 text-sm text-rbx-muted">
                  Your Roblox username is linked. Start the claim to assign a delivery bot.
                </p>
                {canStartClaim && (
                  <Button
                    type="button"
                    disabled={loading}
                    onClick={handleStartClaim}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Starting..." : "Start Claim"}
                  </Button>
                )}
              </Card>
            )}

            {result.assignment && <BotAssignmentCard assignment={result.assignment} />}

            <Button type="button" variant="outline" className="w-full" onClick={resetFlow}>
              Start Over
            </Button>
          </>
        )}

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
