"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ProductOption {
  id: string;
  name: string;
  game: string;
}

export default function AdminCustomerInventoryPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [testCode, setTestCode] = useState("TESTPLAYER");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/products?game=MM2")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setProductId(data.products?.[0]?.id ?? "");
      })
      .catch(() => setError("Failed to load products"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/customer-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          ...(testCode.trim() ? { testCode: testCode.trim() } : {}),
          ...(sessionId.trim() ? { sessionId: sessionId.trim() } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create inventory item");
        return;
      }

      setSuccess(
        `Added ${quantity} × ${data.inventory.product.name} for ${testCode || sessionId}`
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customer Inventory"
        description="Create test RNGBLOX customer inventory items for withdrawal testing."
      />

      <Card title="Add test inventory item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            options={products.map((product) => ({
              value: product.id,
              label: `${product.name} (${product.game})`,
            }))}
          />
          <Input
            label="Quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
          <Input
            label="Test Customer Code"
            value={testCode}
            onChange={(e) => setTestCode(e.target.value.toUpperCase())}
            placeholder="TESTPLAYER"
          />
          <Input
            label="Session ID (optional alternative)"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="session-abc123"
          />
          <Button type="submit" disabled={loading || !productId}>
            {loading ? "Saving..." : "Create Inventory Item"}
          </Button>
        </form>

        {success && <Alert variant="info">{success}</Alert>}
        {error && <Alert>{error}</Alert>}
      </Card>
    </div>
  );
}
