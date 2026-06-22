"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { GAME_OPTIONS } from "@/lib/bot-status";

interface ProductOption {
  id: string;
  name: string;
  itemId: string;
  rarity: string | null;
}

interface SelectedItem {
  productId: string;
  quantity: number;
}

export function CreateOrderForm() {
  const router = useRouter();
  const [game, setGame] = useState("MM2");
  const [robloxUsername, setRobloxUsername] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    orderCode: string;
    claimCode: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoadingProducts(true);
      setError(null);
      setItems([]);
      setSelectedProductId("");
      setSuccess(null);

      try {
        const res = await fetch(`/api/admin/products?game=${encodeURIComponent(game)}`);
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Failed to load products");
          return;
        }

        if (!cancelled) {
          setProducts(data.products ?? []);
          setSelectedProductId(data.products?.[0]?.id ?? "");
        }
      } catch {
        if (!cancelled) setError("Failed to load products");
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [game]);

  function addItem() {
    if (!selectedProductId) return;

    setItems((current) => {
      const existing = current.find((item) => item.productId === selectedProductId);
      if (existing) {
        return current.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + selectedQuantity }
            : item
        );
      }
      return [...current, { productId: selectedProductId, quantity: selectedQuantity }];
    });
    setSelectedQuantity(1);
  }

  function removeItem(productId: string) {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }

  function productLabel(productId: string) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return productId;
    return product.rarity ? `${product.name} (${product.rarity})` : product.name;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Add at least one product");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          robloxUsername: robloxUsername.trim() || undefined,
          items,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create order");
        return;
      }

      setSuccess({
        orderCode: data.order.orderCode,
        claimCode: data.claim.claimCode,
      });
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Select
        label="Game"
        value={game}
        onChange={(e) => setGame(e.target.value)}
        options={GAME_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
      />

      <Input
        label="Customer Roblox Username (optional)"
        value={robloxUsername}
        onChange={(e) => setRobloxUsername(e.target.value)}
        placeholder="e.g. PlayerName123"
        autoComplete="off"
      />

      <div className="space-y-3 rounded-rbx border-2 border-rbx-border bg-rbx-bg p-4">
        <p className="text-sm font-medium text-gray-900">Products</p>

        {loadingProducts ? (
          <p className="text-sm text-gray-500">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500">
            No products for {game}. Import the catalog first.
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select
              label="Product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              options={products.map((product) => ({
                value: product.id,
                label: product.rarity
                  ? `${product.name} (${product.rarity})`
                  : product.name,
              }))}
              className="flex-1"
            />
            <Input
              label="Qty"
              type="number"
              min={1}
              max={999}
              value={selectedQuantity}
              onChange={(e) => setSelectedQuantity(Number(e.target.value))}
              className="w-24"
            />
            <Button type="button" variant="secondary" onClick={addItem}>
              Add
            </Button>
          </div>
        )}

        {items.length > 0 && (
          <ul className="divide-y divide-rbx-border rounded-rbx border-2 border-rbx-border bg-rbx-elevated">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex items-center justify-between px-3 py-2 text-sm text-rbx-muted"
              >
                <span>
                  {productLabel(item.productId)} × {item.quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeItem(item.productId)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || items.length === 0}>
          {loading ? "Creating..." : "Create Test Order"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/orders")}>
          Cancel
        </Button>
      </div>

      {success && (
        <Alert variant="info">
          Order <span className="font-mono font-semibold">{success.orderCode}</span> created.
          Claim code:{" "}
          <span className="font-mono font-semibold">{success.claimCode}</span>
        </Alert>
      )}

      {error && <Alert>{error}</Alert>}
    </form>
  );
}
