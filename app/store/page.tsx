"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

interface StoreProduct {
  id: string;
  name: string;
  game: string;
  rarity: string | null;
  price: number;
}

export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerEmail, setCustomerEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

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
    setCart((current) => ({
      ...current,
      [productId]: Math.max(0, Math.min(99, quantity)),
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

  return (
    <PageShell>
      <PageHeader
        title="RNGBLOX Store"
        description="Purchase items with Stripe test checkout. Inventory credits after payment."
      />

      <div className="mx-auto max-w-4xl space-y-6">
        {cancelled && (
          <Alert variant="info">Checkout was cancelled. Your cart is still here.</Alert>
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

        <Card title="Products" elevated>
          {loading ? (
            <p className="text-sm text-rbx-muted">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-rbx-muted">No priced products available.</p>
          ) : (
            <ul className="space-y-3">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="rounded-rbx border-2 border-rbx-border bg-rbx-bg p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-rbx-text">{product.name}</p>
                      <p className="text-xs text-rbx-dim">
                        {product.game}
                        {product.rarity ? ` · ${product.rarity}` : ""}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-rbx-green">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        label="Qty"
                        type="number"
                        min={0}
                        max={99}
                        value={cart[product.id] ?? 0}
                        onChange={(e) =>
                          updateQuantity(product.id, Number(e.target.value))
                        }
                        className="w-24"
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Cart" elevated>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-rbx-muted">Total</span>
            <Badge variant="info">${cartTotal.toFixed(2)}</Badge>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={checkingOut || cartItems.length === 0}
            onClick={handleCheckout}
          >
            {checkingOut ? "Redirecting to Stripe..." : "Checkout with Stripe"}
          </Button>
        </Card>

        {error && <Alert>{error}</Alert>}
      </div>
    </PageShell>
  );
}
