"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge, statusToLabel } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ProductImagePlaceholder, gameBadgeClass, rarityBadgeClass } from "@/components/ui/ProductPlaceholder";

interface InventoryItem {
  id: string;
  productId: string;
  name: string;
  game: string;
  rarity: string | null;
  value: number;
  quantity: number;
  available: number;
  sourceOrderCode?: string | null;
}

type LookupType = "testCode" | "sessionId" | "email";

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <span className="text-2xl font-extrabold text-rbx-text">{value}</span>
      <span className="mt-1 text-xs font-bold uppercase tracking-wider text-rbx-muted">{label}</span>
      {sub && <span className="mt-0.5 text-xs text-rbx-dim">{sub}</span>}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="animate-pulse rounded-rbx-lg border border-rbx-border bg-rbx-surface p-4 space-y-3">
      <div className="h-28 rounded-rbx bg-rbx-elevated" />
      <div className="h-4 w-3/4 rounded bg-rbx-elevated" />
      <div className="h-3 w-1/2 rounded bg-rbx-elevated" />
    </div>
  );
}

export default function InventoryPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lookupType, setLookupType] = useState<LookupType>("testCode");
  const [lookupValue, setLookupValue] = useState("TESTPLAYER");
  const [sessionId, setSessionId] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const sessionFromUrl = searchParams.get("sessionId");
    const paid = searchParams.get("paid") === "1";
    if (sessionFromUrl) {
      setLookupType("sessionId");
      setLookupValue(sessionFromUrl);
      setPaidSuccess(paid);
      void loadInventory("sessionId", sessionFromUrl);
    }
  }, [searchParams]);

  async function loadInventory(type: LookupType, value: string) {
    setLoading(true);
    setError(null);
    setSelected({});
    const params = new URLSearchParams();
    if (type === "testCode") params.set("testCode", value.trim().toUpperCase());
    if (type === "sessionId") params.set("sessionId", value.trim());
    if (type === "email") params.set("email", value.trim().toLowerCase());
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
      setSessionId(data.sessionId ?? value.trim());
      setCustomerId(data.customerId ?? undefined);
      setLoaded(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    await loadInventory(lookupType, lookupValue);
  }

  function toggleItem(item: InventoryItem) {
    setSelected((current) => {
      const next = { ...current };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = Math.min(1, item.available);
      }
      return next;
    });
  }

  function updateQuantity(inventoryId: string, quantity: number) {
    setSelected((current) => ({ ...current, [inventoryId]: quantity }));
  }

  async function confirmWithdraw() {
    setWithdrawing(true);
    setError(null);
    const payloadItems = Object.entries(selected)
      .filter(([, quantity]) => quantity > 0)
      .map(([inventoryId, quantity]) => ({ inventoryId, quantity }));
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(lookupType === "testCode"
            ? { testCode: lookupValue.trim().toUpperCase() }
            : lookupType === "email"
              ? { customerId }
              : { sessionId: sessionId || lookupValue.trim() }),
          items: payloadItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create withdrawal");
        setConfirmOpen(false);
        return;
      }
      router.push(`/withdraw/${data.withdrawal.withdrawalCode}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setWithdrawing(false);
      setConfirmOpen(false);
    }
  }

  const selectedCount = Object.keys(selected).length;
  const selectedTotal = items.reduce((sum, item) => {
    const qty = selected[item.id] ?? 0;
    return sum + qty * item.value;
  }, 0);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const availableItems = items.reduce((s, i) => s + i.available, 0);
  const reservedItems = items.reduce((s, i) => s + (i.quantity - i.available), 0);
  const totalValue = items.reduce((s, i) => s + i.available * i.value, 0);

  return (
    <PageShell>
      <div className="space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2 py-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-rbx-text">
            My RNGBLOX Inventory
          </h1>
          <p className="text-sm text-rbx-muted max-w-lg mx-auto">
            Withdraw your Roblox items safely through our delivery queue.
          </p>
        </div>

        {/* Lookup card */}
        <div className="mx-auto max-w-lg">
          <Card elevated>
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="flex gap-2">
                {(["testCode", "sessionId", "email"] as LookupType[]).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    variant={lookupType === type ? "primary" : "outline"}
                    onClick={() => setLookupType(type)}
                  >
                    {type === "testCode" ? "Test Code" : type === "sessionId" ? "Session" : "Email"}
                  </Button>
                ))}
              </div>
              <Input
                label={
                  lookupType === "testCode"
                    ? "Test Customer Code"
                    : lookupType === "email"
                      ? "Customer Email"
                      : "Session ID"
                }
                value={lookupValue}
                onChange={(e) => setLookupValue(e.target.value)}
                placeholder={
                  lookupType === "testCode"
                    ? "TESTPLAYER"
                    : lookupType === "email"
                      ? "you@example.com"
                      : "session-abc123"
                }
                required
              />
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Loading…" : "Load Inventory"}
              </Button>
            </form>
          </Card>
        </div>

        {paidSuccess && (
          <Alert variant="success">
            Payment successful! Your purchased items will appear below once inventory is credited.
          </Alert>
        )}

        {error && <Alert>{error}</Alert>}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonTile key={i} />)}
          </div>
        )}

        {/* Summary stats */}
        {loaded && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Total Items" value={totalItems} />
            <SummaryCard label="Available" value={availableItems} />
            <SummaryCard label="Reserved" value={reservedItems} />
            <SummaryCard label="Total Value" value={`$${totalValue.toFixed(2)}`} />
          </div>
        )}

        {/* Inventory grid */}
        {loaded && items.length === 0 && !loading && (
          <Card elevated>
            <div className="py-12 text-center space-y-2">
              <div className="text-5xl">📦</div>
              <p className="font-bold text-rbx-text">No items in your inventory yet</p>
              <p className="text-sm text-rbx-muted">
                Once you win or purchase items, they will appear here.
              </p>
            </div>
          </Card>
        )}

        {loaded && items.length > 0 && (
          <>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-rbx-text">
                  Your Items
                  <span className="ml-2 text-sm font-normal text-rbx-muted">({items.length})</span>
                </h2>
                {selectedCount > 0 && (
                  <span className="text-sm font-semibold text-rbx-blue">
                    {selectedCount} selected · ${selectedTotal.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const isSelected = Boolean(selected[item.id]);
                  const depleted = item.available < 1;
                  return (
                    <div
                      key={item.id}
                      className={`inventory-tile ${isSelected ? "inventory-tile-selected" : ""}`}
                    >
                      {/* Image area */}
                      <div className="relative">
                        <ProductImagePlaceholder
                          name={item.name}
                          game={item.game}
                          className="h-32 w-full"
                        />
                        {/* Game badge */}
                        <span
                          className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${gameBadgeClass(item.game)}`}
                        >
                          {item.game.replace(/_/g, " ")}
                        </span>
                        {depleted && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-t-rbx-lg bg-black/40">
                            <span className="rounded-full bg-rbx-red px-3 py-1 text-xs font-bold text-white">
                              Unavailable
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-1 flex-col p-3 gap-2">
                        <div>
                          <p className="font-bold text-rbx-text leading-tight">{item.name}</p>
                          {item.rarity && (
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${rarityBadgeClass(item.rarity)}`}
                            >
                              {item.rarity}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-rbx-muted">
                          <span className="font-semibold text-rbx-text">${item.value.toFixed(2)}</span>
                          <span>{item.available} available</span>
                        </div>

                        {isSelected && (
                          <Input
                            label="Qty"
                            type="number"
                            min={1}
                            max={item.available}
                            value={selected[item.id] ?? 1}
                            onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          />
                        )}

                        <Button
                          type="button"
                          variant={isSelected ? "success" : depleted ? "ghost" : "outline"}
                          size="sm"
                          disabled={depleted}
                          onClick={() => toggleItem(item)}
                          className="w-full mt-auto"
                        >
                          {isSelected ? "✓ Selected" : depleted ? "Unavailable" : "Withdraw"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checkout bar */}
            {selectedCount > 0 && (
              <div className="sticky bottom-4 left-0 right-0">
                <div className="mx-auto max-w-lg rounded-rbx-lg border border-rbx-border bg-rbx-surface p-4 shadow-rbx-card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-rbx-text">
                      {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
                    </span>
                    <Badge variant={selectedTotal > 200 ? "warning" : "info"}>
                      ${selectedTotal.toFixed(2)}
                    </Badge>
                  </div>
                  {selectedTotal > 200 && (
                    <Alert variant="warning" className="mb-3">
                      Withdrawals over $200 require customer service review for fraud protection.
                    </Alert>
                  )}
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={() => setConfirmOpen(true)}
                  >
                    Withdraw Selected Items →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Withdrawal"
        description={
          <div className="space-y-2">
            <p>You are about to withdraw <strong>{selectedCount}</strong> item(s) with a total value of <strong>${selectedTotal.toFixed(2)}</strong>.</p>
            {selectedTotal > 200 && (
              <p className="text-rbx-yellow font-medium">⚠ This withdrawal requires support review due to high value.</p>
            )}
            <p>A delivery queue entry will be created and you will be redirected to track it.</p>
          </div>
        }
        confirmLabel="Create Withdrawal"
        loading={withdrawing}
        onConfirm={confirmWithdraw}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageShell>
  );
}
