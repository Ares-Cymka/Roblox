"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

interface ProductOption {
  id: string;
  name: string;
  itemId: string;
  rarity: string | null;
}

interface BotInventoryManagerProps {
  botId: string;
  game: string;
  products: ProductOption[];
}

export function BotInventoryManager({
  botId,
  game,
  products,
}: BotInventoryManagerProps) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(0);
  const [reservedQuantity, setReservedQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/bots/${botId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity, reservedQuantity }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save inventory");
        return;
      }

      setQuantity(0);
      setReservedQuantity(0);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (products.length === 0) {
    return (
      <Card title="Add inventory item">
        <p className="text-sm text-gray-500">
          No catalog products found for {game}. Import products for this game first.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Add inventory item"
      description="Items this bot holds inside the Roblox game (not website catalog stock)."
    >
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Product"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          options={products.map((product) => ({
            value: product.id,
            label: `${product.name} (${product.itemId})`,
          }))}
          className="sm:col-span-2"
        />
        <Input
          label="Quantity"
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
        <Input
          label="Reserved Qty"
          type="number"
          min={0}
          value={reservedQuantity}
          onChange={(e) => setReservedQuantity(Number(e.target.value))}
        />
        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <Button type="submit" disabled={loading || !productId}>
            {loading ? "Saving..." : "Add / Update Item"}
          </Button>
        </div>
      </form>
      {error && <Alert className="mt-4">{error}</Alert>}
    </Card>
  );
}
