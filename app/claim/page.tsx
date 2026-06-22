"use client";

import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge, statusToBadgeVariant, statusToLabel } from "@/components/ui/Badge";
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
  assignedItems: Array<{ productId: string; name: string; quantity: number }>;
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
      if (!res.ok) { setError(data.error ?? "Failed to look up claim code"); return; }
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
        body: JSON.stringify({ claimCode: result.claim.claimCode, robloxUsername: robloxUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to continue claim"); return; }
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
      const res = await fetch(`/api/claims/${result.claim.id}/start`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const shortageText = Array.isArray(data.shortages)
          ? data.shortages.map((e: { name: string; required: number; available: number }) => `${e.name}: need ${e.required}, bot has ${e.available}`).join("; ")
          : null;
        setError(shortageText ? `${data.error ?? "Failed"} (${shortageText})` : data.error ?? "Failed to start claim");
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
  const canStartClaim = result && usernameLinked && !claimStarted &&
    (result.claim.status === "USERNAME_LINKED" || result.claim.status === "PENDING");

  return (
    <PageShell narrow>
      <div className="space-y-6">
        {/* Hero */}
        <div className="text-center py-4 space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-rbx-text">
            🎁 Claim Delivery
          </h1>
          <p className="text-sm text-rbx-muted">
            Enter your claim code, link your Roblox account, and start delivery.
          </p>
        </div>

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
                {loading ? "Looking up…" : "Look Up Claim →"}
              </Button>
            </form>
          </Card>
        )}

        {step === "active" && result && (
          <>
            <Card title="Your Order" elevated>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="rbx-label">Order Code</dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-rbx-text">{result.order.orderCode}</dd>
                </div>
                <div>
                  <dt className="rbx-label">Claim Code</dt>
                  <dd className="mt-1 font-mono text-sm font-bold text-rbx-text">{result.claim.claimCode}</dd>
                </div>
                <div>
                  <dt className="rbx-label">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={statusToBadgeVariant(result.claim.status)}>
                      {statusToLabel(result.claim.status)}
                    </Badge>
                  </dd>
                </div>
                {result.claim.robloxUsername && (
                  <div>
                    <dt className="rbx-label">Roblox Username</dt>
                    <dd className="mt-1 text-sm font-semibold text-rbx-text">{result.claim.robloxUsername}</dd>
                  </div>
                )}
                {result.order.game && (
                  <div>
                    <dt className="rbx-label">Game</dt>
                    <dd className="mt-1 text-sm text-rbx-text">{result.order.game.replace(/_/g, " ")}</dd>
                  </div>
                )}
              </dl>

              <div className="rbx-divider mt-4 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rbx-muted">Items</p>
                <ul className="space-y-2">
                  {result.items.map((item) => (
                    <li key={item.id} className="rbx-list-row">
                      <span className="font-semibold text-rbx-text">
                        {item.name}
                        {item.rarity && <span className="ml-1.5 text-xs text-rbx-dim">{item.rarity}</span>}
                      </span>
                      <span className="font-bold text-rbx-blue">×{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {!usernameLinked && (
              <Card title="Link Your Roblox Account" elevated>
                <p className="mb-4 text-sm text-rbx-muted">
                  We need your Roblox username to assign a delivery bot.
                </p>
                <form onSubmit={handleContinue} className="space-y-4">
                  <Input
                    label="Roblox Username"
                    placeholder="YourRobloxName"
                    value={robloxUsername}
                    onChange={(e) => setRobloxUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? "Saving…" : "Confirm Username →"}
                  </Button>
                </form>
              </Card>
            )}

            {usernameLinked && !claimStarted && (
              <Card title="Ready to Start Delivery" elevated>
                <p className="mb-4 text-sm text-rbx-muted">
                  Your Roblox username is linked. Click below to be assigned a delivery bot.
                </p>
                {canStartClaim && (
                  <Button type="button" disabled={loading} onClick={handleStartClaim} className="w-full" size="lg">
                    {loading ? "Starting…" : "🚀 Start Claim"}
                  </Button>
                )}
              </Card>
            )}

            {result.assignment && <BotAssignmentCard assignment={result.assignment} />}

            <Button type="button" variant="outline" className="w-full" onClick={resetFlow}>
              ← Start Over
            </Button>
          </>
        )}

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
