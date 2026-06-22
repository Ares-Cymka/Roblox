"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

interface InventoryItem {
  id: string;
  productId: string;
  name: string;
  game: string;
  rarity: string | null;
  value: number;
  quantity: number;
  available: number;
}

export default function InventoryPage() {
  const router = useRouter();
  const [lookupType, setLookupType] = useState<"testCode" | "sessionId">("testCode");
  const [lookupValue, setLookupValue] = useState("TESTPLAYER");
  const [sessionId, setSessionId] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSelected({});

    const params = new URLSearchParams(
      lookupType === "testCode"
        ? { testCode: lookupValue.trim().toUpperCase() }
        : { sessionId: lookupValue.trim() }
    );

    try {
      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load inventory");
        setItems([]);
        setLoaded(false);
        return;
      }

      setItems(data.items ?? []);
      setSessionId(data.sessionId ?? lookupValue.trim());
      setLoaded(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(item: InventoryItem) {
    setSelected((current) => {
      const next = { ...current };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = 1;
      }
      return next;
    });
  }

  function updateQuantity(inventoryId: string, quantity: number) {
    setSelected((current) => ({ ...current, [inventoryId]: quantity }));
  }

  async function handleWithdraw() {
    const payloadItems = Object.entries(selected)
      .filter(([, quantity]) => quantity > 0)
      .map(([inventoryId, quantity]) => ({ inventoryId, quantity }));

    if (payloadItems.length === 0) {
      setError("Select at least one item to withdraw");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(lookupType === "testCode"
            ? { testCode: lookupValue.trim().toUpperCase() }
            : { sessionId: sessionId || lookupValue.trim() }),
          items: payloadItems,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create withdrawal");
        return;
      }

      router.push(`/withdraw/${data.withdrawal.withdrawalCode}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedTotal = items.reduce((sum, item) => {
    const qty = selected[item.id] ?? 0;
    return sum + qty * item.value;
  }, 0);

  return (
    <PageShell>
      <PageHeader
        title="My Inventory"
        description="View your RNGBLOX winnings and withdraw items for delivery."
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <Card elevated>
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={lookupType === "testCode" ? "secondary" : "outline"}
                onClick={() => setLookupType("testCode")}
              >
                Test Code
              </Button>
              <Button
                type="button"
                variant={lookupType === "sessionId" ? "secondary" : "outline"}
                onClick={() => setLookupType("sessionId")}
              >
                Session ID
              </Button>
            </div>
            <Input
              label={lookupType === "testCode" ? "Test Customer Code" : "Session ID"}
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
              placeholder={lookupType === "testCode" ? "TESTPLAYER" : "session-abc123"}
              required
            />
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? "Loading..." : "Load Inventory"}
            </Button>
          </form>
        </Card>

        {loaded && (
          <Card title="Inventory Items" elevated>
            {items.length === 0 ? (
              <p className="text-sm text-rbx-muted">No inventory items found.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => {
                  const isSelected = Boolean(selected[item.id]);
                  return (
                    <li
                      key={item.id}
                      className="rounded-rbx border-2 border-rbx-border bg-rbx-bg p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-rbx-text">{item.name}</p>
                          <p className="text-xs text-rbx-dim">
                            {item.game}
                            {item.rarity ? ` · ${item.rarity}` : ""} · ${item.value.toFixed(2)} each
                          </p>
                          <p className="mt-1 text-xs font-semibold text-rbx-muted">
                            Available: {item.available} / {item.quantity}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant={isSelected ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => toggleItem(item)}
                          disabled={item.available < 1}
                        >
                          {isSelected ? "Selected" : "Withdraw"}
                        </Button>
                      </div>
                      {isSelected && (
                        <div className="mt-3">
                          <Input
                            label="Quantity"
                            type="number"
                            min={1}
                            max={item.available}
                            value={selected[item.id] ?? 1}
                            onChange={(e) =>
                              updateQuantity(item.id, Number(e.target.value))
                            }
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {Object.keys(selected).length > 0 && (
              <div className="rbx-divider mt-5 space-y-3 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-rbx-muted">Selected total value</span>
                  <Badge variant={selectedTotal > 200 ? "warning" : "info"}>
                    ${selectedTotal.toFixed(2)}
                  </Badge>
                </div>
                {selectedTotal > 200 && (
                  <Alert>
                    Withdrawals over $200 require customer service review for fraud protection.
                  </Alert>
                )}
                <Button
                  type="button"
                  disabled={loading}
                  onClick={handleWithdraw}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Creating withdrawal..." : "Withdraw Selected Items"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
