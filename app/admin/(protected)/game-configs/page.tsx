"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";

interface GameConfig {
  game: string;
  deliveryMethod: string;
  requiresFriend: boolean;
  requiresPrivateServer: boolean;
  requiresCustomerJoin: boolean;
  requiresManualConfirmation: boolean;
  instructions: string | null;
}

export default function AdminGameConfigsPage() {
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [form, setForm] = useState<GameConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/game-configs")
      .then((res) => res.json())
      .then((data) => {
        setConfigs(data.configs ?? []);
        const first = data.configs?.[0];
        if (first) {
          setSelectedGame(first.game);
          setForm(first);
        }
      })
      .catch(() => setError("Failed to load game configs"));
  }, []);

  useEffect(() => {
    const config = configs.find((entry) => entry.game === selectedGame);
    if (config) setForm({ ...config });
  }, [selectedGame, configs]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/game-configs?game=${form.game}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMethod: form.deliveryMethod,
          requiresFriend: form.requiresFriend,
          requiresPrivateServer: form.requiresPrivateServer,
          requiresCustomerJoin: form.requiresCustomerJoin,
          requiresManualConfirmation: form.requiresManualConfirmation,
          instructions: form.instructions,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to update config");
        return;
      }

      setConfigs((current) =>
        current.map((entry) => (entry.game === data.config.game ? data.config : entry))
      );
      setSuccess(`Updated ${form.game} delivery config`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!form) {
    return <p className="text-sm text-gray-500">Loading game configs...</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Game Delivery Configs"
        description="Configure delivery method and instructions per game."
      />

      <Card title="Edit config">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Game"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
            options={configs.map((config) => ({
              value: config.game,
              label: config.game.replace(/_/g, " "),
            }))}
          />

          <div className="flex items-center gap-2">
            <Badge variant="info">{form.deliveryMethod.replace(/_/g, " ")}</Badge>
          </div>

          <Select
            label="Delivery Method"
            value={form.deliveryMethod}
            onChange={(e) => setForm({ ...form, deliveryMethod: e.target.value })}
            options={[
              { value: "TRADING", label: "Trading" },
              { value: "GIFTING", label: "Gifting" },
              { value: "MAILBOX", label: "Mailbox" },
              { value: "JOIN_BASED", label: "Join Based" },
              { value: "MANUAL", label: "Manual" },
            ]}
          />

          <label className="flex items-center gap-2 text-sm font-semibold text-rbx-muted">
            <input
              type="checkbox"
              checked={form.requiresFriend}
              onChange={(e) => setForm({ ...form, requiresFriend: e.target.checked })}
            />
            Requires friend request
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-rbx-muted">
            <input
              type="checkbox"
              checked={form.requiresPrivateServer}
              onChange={(e) =>
                setForm({ ...form, requiresPrivateServer: e.target.checked })
              }
            />
            Requires private server
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-rbx-muted">
            <input
              type="checkbox"
              checked={form.requiresCustomerJoin}
              onChange={(e) =>
                setForm({ ...form, requiresCustomerJoin: e.target.checked })
              }
            />
            Requires customer join
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-rbx-muted">
            <input
              type="checkbox"
              checked={form.requiresManualConfirmation}
              onChange={(e) =>
                setForm({ ...form, requiresManualConfirmation: e.target.checked })
              }
            />
            Requires manual confirmation
          </label>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Instructions
            </label>
            <textarea
              className="rbx-textarea"
              value={form.instructions ?? ""}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Config"}
          </Button>
        </form>

        {success && <Alert variant="info">{success}</Alert>}
        {error && <Alert>{error}</Alert>}
      </Card>
    </div>
  );
}
