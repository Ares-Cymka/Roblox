"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { ProductImagePlaceholder } from "@/components/ui/ProductPlaceholder";

interface StoreProduct {
  id: string;
  name: string;
  game: string;
  itemId?: string;
  rarity: string | null;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

const GAME_META: Record<
  string,
  { label: string; emoji: string; description: string; color: string }
> = {
  MM2: {
    label: "Murder Mystery 2",
    emoji: "🔪",
    description: "Trade knives, guns & pets",
    color: "from-red-500/20 to-rose-600/10 border-red-400/30 hover:border-red-400/60",
  },
  ADOPT_ME: {
    label: "Adopt Me!",
    emoji: "🐾",
    description: "Pets, eggs & vehicles",
    color:
      "from-purple-500/20 to-violet-600/10 border-purple-400/30 hover:border-purple-400/60",
  },
  SAB: {
    label: "Steal a Brainrot",
    emoji: "🧠",
    description: "Rare brainrot items",
    color:
      "from-green-500/20 to-emerald-600/10 border-green-400/30 hover:border-green-400/60",
  },
  GAG2: {
    label: "Grow a Garden 2",
    emoji: "🌱",
    description: "Seeds, tools & plants",
    color:
      "from-lime-500/20 to-green-600/10 border-lime-400/30 hover:border-lime-400/60",
  },
};

function getGameMeta(game: string) {
  return GAME_META[game] ?? {
    label: game,
    emoji: "🎮",
    description: "Game items",
    color:
      "from-blue-500/20 to-sky-600/10 border-blue-400/30 hover:border-blue-400/60",
  };
}

const RARITY_COLORS: Record<string, string> = {
  common: "bg-gray-100 text-gray-600",
  uncommon: "bg-green-100 text-green-700",
  rare: "bg-blue-100 text-blue-700",
  epic: "bg-purple-100 text-purple-700",
  legendary: "bg-yellow-100 text-yellow-700",
  divine: "bg-red-100 text-red-700",
  godly: "bg-rose-100 text-rose-700",
};

function rarityClass(rarity: string | null) {
  if (!rarity) return "bg-gray-100 text-gray-500";
  return RARITY_COLORS[rarity.toLowerCase()] ?? "bg-gray-100 text-gray-500";
}

// ── Game Selection Modal ──────────────────────────────────────────────────────

interface GameSelectModalProps {
  games: string[];
  onSelect: (game: string) => void;
}

function GameSelectModal({ games, onSelect }: GameSelectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-xl animate-fade-in">
        <div className="rounded-rbx-lg border border-rbx-border bg-rbx-surface p-6 shadow-rbx-card-hover">
          <div className="mb-1 text-center">
            <span className="text-3xl">🎮</span>
            <h2 className="mt-2 text-xl font-bold text-rbx-text">Choose a Game</h2>
            <p className="mt-1 text-sm text-rbx-muted">
              Select the game you want to buy items from.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {games.map((game) => {
              const meta = getGameMeta(game);
              return (
                <button
                  key={game}
                  type="button"
                  onClick={() => onSelect(game)}
                  className={cn(
                    "group flex items-center gap-4 rounded-rbx border-2 bg-gradient-to-br p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rbx-blue",
                    meta.color
                  )}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-rbx bg-white/60 text-2xl shadow-sm group-hover:scale-110 transition-transform duration-150">
                    {meta.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-rbx-text">{meta.label}</p>
                    <p className="text-xs text-rbx-muted">{meta.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Store Page ────────────────────────────────────────────────────────────────

export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerEmail, setCustomerEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  // Game selection — null means the modal is open
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCancelled(params.get("cancelled") === "1");
    setSessionId(crypto.randomUUID());

    fetch("/api/store/products")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load products");
        setProducts(data.products ?? []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load products");
      })
      .finally(() => setLoading(false));
  }, []);

  // Unique games that have at least one product
  const availableGames = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const p of products) {
      if (!seen.has(p.game)) {
        seen.add(p.game);
        list.push(p.game);
      }
    }
    return list;
  }, [products]);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.game === selectedGame),
    [products, selectedGame]
  );

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return sum + (product?.price ?? 0) * item.quantity;
      }, 0),
    [cartItems, products]
  );

  function updateQuantity(productId: string, quantity: number) {
    const product = products.find((entry) => entry.id === productId);
    const maxQty = product?.stock ?? 99;
    setCart((current) => ({
      ...current,
      [productId]: Math.max(0, Math.min(maxQty, quantity)),
    }));
  }

  async function handleCheckout() {
    if (cartItems.length === 0) {
      setError("Add at least one item to your cart");
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          customerEmail: customerEmail.trim() || undefined,
          sessionId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Checkout failed");
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  }

  const selectedGameMeta = selectedGame ? getGameMeta(selectedGame) : null;

  // Show game-select modal when products have loaded and no game is chosen
  const showGameModal = !loading && availableGames.length > 0 && selectedGame === null;

  return (
    <PageShell>
      {/* Game select modal */}
      {showGameModal && (
        <GameSelectModal
          games={availableGames}
          onSelect={(game) => setSelectedGame(game)}
        />
      )}

      <PageHeader
        title="RNGBLOX Store"
        description="Purchase in-stock MM2 items from our delivery bots. Inventory credits after payment."
      />

      <div className="mx-auto max-w-4xl space-y-6">
        {cancelled && (
          <Alert variant="info">Checkout was cancelled. Your cart is still here.</Alert>
        )}

        {/* Game selector banner — shown after a game is picked */}
        {selectedGame && selectedGameMeta && (
          <div
            className={cn(
              "flex items-center justify-between gap-4 rounded-rbx-lg border-2 bg-gradient-to-br px-5 py-4",
              selectedGameMeta.color
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-rbx bg-white/60 text-xl shadow-sm">
                {selectedGameMeta.emoji}
              </span>
              <div>
                <p className="font-bold text-rbx-text">{selectedGameMeta.label}</p>
                <p className="text-xs text-rbx-muted">{filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""} available</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedGame(null)}
            >
              Change Game
            </Button>
          </div>
        )}

        <Card title="Checkout Details" elevated>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email (optional)"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Guest Session ID"
              value={sessionId}
              readOnly
            />
            <p className="text-xs text-rbx-dim sm:col-span-2">
              Used to load inventory after payment at /inventory?sessionId=...
            </p>
          </div>
        </Card>

        {/* Products */}
        {loading ? (
          <Card elevated>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-rbx bg-rbx-border/40" />
              ))}
            </div>
          </Card>
        ) : !selectedGame ? (
          <Card elevated>
            <div className="py-8 text-center text-rbx-muted">
              <span className="block text-4xl mb-3">🎮</span>
              <p className="font-semibold">Select a game above to browse items.</p>
            </div>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card elevated>
            <div className="py-8 text-center text-rbx-muted">
              <span className="block text-3xl mb-2">{selectedGameMeta?.emoji}</span>
              <p className="font-semibold">No items available for {selectedGameMeta?.label}.</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setSelectedGame(null)}
              >
                Browse other games
              </Button>
            </div>
          </Card>
        ) : (
          <Card title={`${selectedGameMeta?.label} Items`} elevated>
            <ul className="space-y-3">
              {filteredProducts.map((product) => {
                const qty = cart[product.id] ?? 0;
                const atMax = qty >= product.stock;
                return (
                  <li
                    key={product.id}
                    className={cn(
                      "rounded-rbx border-2 bg-rbx-bg p-4 transition-colors",
                      qty > 0 ? "border-rbx-blue/50 bg-rbx-blue/5" : "border-rbx-border"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Item thumbnail */}
                        <div className="flex h-12 w-12 shrink-0 rounded-rbx overflow-hidden">
                          <ProductImagePlaceholder
                            name={product.name}
                            game={product.game}
                            imageUrl={product.imageUrl}
                            className="h-12 w-12"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-rbx-text truncate">{product.name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {product.rarity && (
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                  rarityClass(product.rarity)
                                )}
                              >
                                {product.rarity}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-rbx-green">
                              ${product.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-rbx-muted">
                              {product.stock} in stock
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(product.id, qty - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-rbx border-2 border-rbx-border bg-rbx-surface font-bold text-rbx-muted transition hover:border-rbx-blue hover:text-rbx-blue disabled:opacity-40"
                          disabled={qty === 0}
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-rbx-text">
                          {qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(product.id, qty + 1)}
                          disabled={atMax}
                          className="flex h-8 w-8 items-center justify-center rounded-rbx border-2 border-rbx-border bg-rbx-surface font-bold text-rbx-muted transition hover:border-rbx-blue hover:text-rbx-blue disabled:opacity-40"
                        >
                          +
                        </button>
                        {qty > 0 && (
                          <span className="ml-1 text-xs text-rbx-muted">
                            = ${(product.price * qty).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Cart */}
        <Card title="Cart" elevated>
          {cartItems.length === 0 ? (
            <p className="mb-4 text-sm text-rbx-muted">Your cart is empty. Add items above.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {cartItems.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;
                return (
                  <li key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="text-rbx-text font-medium">
                      {product.name} ×{item.quantity}
                    </span>
                    <span className="font-semibold text-rbx-muted">
                      ${(product.price * item.quantity).toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mb-4 flex items-center justify-between border-t border-rbx-border pt-4">
            <span className="font-semibold text-rbx-muted">Total</span>
            <Badge variant="info">${cartTotal.toFixed(2)}</Badge>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={checkingOut || cartItems.length === 0}
            onClick={handleCheckout}
          >
            {checkingOut ? "Redirecting to Stripe…" : "Checkout with Stripe →"}
          </Button>
        </Card>

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
