"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface InventoryRow {
  id: string;
  quantity: number;
  reservedQuantity: number;
  product: {
    name: string;
    itemId: string;
    rarity: string | null;
  };
}

interface BotInventoryTableProps {
  botId: string;
  items: InventoryRow[];
}

export function BotInventoryTable({ botId, items }: BotInventoryTableProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleUpdate(item: InventoryRow, quantity: number, reservedQuantity: number) {
    setSavingId(item.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/bots/${botId}/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, reservedQuantity }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to update inventory");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(inventoryId: string) {
    if (!confirm("Remove this inventory item from the bot?")) return;

    setSavingId(inventoryId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/bots/${botId}/inventory/${inventoryId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete inventory");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No in-game inventory items yet. Add products above.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="pb-2 pr-4 font-medium">Product</th>
              <th className="pb-2 pr-4 font-medium">Item ID</th>
              <th className="pb-2 pr-4 font-medium">Rarity</th>
              <th className="pb-2 pr-4 font-medium">Qty</th>
              <th className="pb-2 pr-4 font-medium">Reserved</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <InventoryRowEditor
                key={item.id}
                item={item}
                saving={savingId === item.id}
                onSave={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

function InventoryRowEditor({
  item,
  saving,
  onSave,
  onDelete,
}: {
  item: InventoryRow;
  saving: boolean;
  onSave: (item: InventoryRow, quantity: number, reservedQuantity: number) => void;
  onDelete: (id: string) => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [reservedQuantity, setReservedQuantity] = useState(item.reservedQuantity);

  return (
    <tr className="border-b border-gray-50 align-top">
      <td className="py-3 pr-4 font-medium">{item.product.name}</td>
      <td className="py-3 pr-4 font-mono text-xs">{item.product.itemId}</td>
      <td className="py-3 pr-4">{item.product.rarity ?? "—"}</td>
      <td className="py-3 pr-4">
        <Input
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </td>
      <td className="py-3 pr-4">
        <Input
          type="number"
          min={0}
          value={reservedQuantity}
          onChange={(e) => setReservedQuantity(Number(e.target.value))}
        />
      </td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => onSave(item, quantity, reservedQuantity)}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => onDelete(item.id)}
          >
            Remove
          </Button>
        </div>
      </td>
    </tr>
  );
}
