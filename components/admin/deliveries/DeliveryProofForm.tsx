"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface DeliveryProofFormProps {
  deliveryJobId: string;
}

export function DeliveryProofForm({ deliveryJobId }: DeliveryProofFormProps) {
  const router = useRouter();
  const [proofText, setProofText] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!proofText.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/deliveries/${deliveryJobId}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proofText: proofText.trim(),
          proofImageUrl: proofImageUrl.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Failed to save proof");
        return;
      }

      setSuccess(true);
      setProofText("");
      setProofImageUrl("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Proof Note"
        value={proofText}
        onChange={(e) => setProofText(e.target.value)}
        placeholder="e.g. Trade completed manually in MM2 with customer RadiomirrorQ."
        required
      />
      <Input
        label="Proof Image URL (optional)"
        value={proofImageUrl}
        onChange={(e) => setProofImageUrl(e.target.value)}
        placeholder="https://..."
        type="url"
      />
      <Button type="submit" disabled={loading || !proofText.trim()} variant="secondary">
        {loading ? "Saving..." : "Save Proof"}
      </Button>
      {success && (
        <Alert variant="success">Proof saved successfully.</Alert>
      )}
      {error && <Alert>{error}</Alert>}
    </form>
  );
}
