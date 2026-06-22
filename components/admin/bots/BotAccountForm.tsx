"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { BOT_STATUS_OPTIONS, GAME_OPTIONS } from "@/lib/bot-status";

export interface BotAccountFormValues {
  game: string;
  robloxUsername: string;
  robloxUserId: string;
  profileUrl: string;
  privateServerUrl: string;
  status: string;
  maxConcurrentDeliveries: number;
}

interface BotAccountFormProps {
  mode: "create" | "edit";
  botId?: string;
  initialValues?: Partial<BotAccountFormValues>;
}

const defaultValues: BotAccountFormValues = {
  game: "MM2",
  robloxUsername: "",
  robloxUserId: "",
  profileUrl: "",
  privateServerUrl: "",
  status: "OFFLINE",
  maxConcurrentDeliveries: 1,
};

export function BotAccountForm({ mode, botId, initialValues }: BotAccountFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BotAccountFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateField<K extends keyof BotAccountFormValues>(
    key: K,
    value: BotAccountFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = mode === "create" ? "/api/admin/bots" : `/api/admin/bots/${botId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save bot account");
        return;
      }

      router.push(`/admin/bots/${data.bot.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Game"
        value={values.game}
        onChange={(e) => updateField("game", e.target.value)}
        options={GAME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <Input
        label="Roblox Username"
        value={values.robloxUsername}
        onChange={(e) => updateField("robloxUsername", e.target.value)}
        placeholder="e.g. radiomirrorq"
        required
      />
      <Input
        label="Roblox User ID (optional)"
        value={values.robloxUserId}
        onChange={(e) => updateField("robloxUserId", e.target.value)}
        placeholder="Numeric user ID"
      />
      <Input
        label="Profile URL"
        value={values.profileUrl}
        onChange={(e) => updateField("profileUrl", e.target.value)}
        placeholder="https://www.roblox.com/users/..."
      />
      <Input
        label="Private Server URL (optional)"
        value={values.privateServerUrl}
        onChange={(e) => updateField("privateServerUrl", e.target.value)}
        placeholder="https://www.roblox.com/games/..."
      />
      <Select
        label="Status"
        value={values.status}
        onChange={(e) => updateField("status", e.target.value)}
        options={BOT_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <Input
        label="Max Concurrent Deliveries"
        type="number"
        min={1}
        max={20}
        value={values.maxConcurrentDeliveries}
        onChange={(e) =>
          updateField("maxConcurrentDeliveries", Number(e.target.value))
        }
        required
      />

      <p className="text-xs text-gray-500">
        Client-owned bot accounts only. Roblox passwords are never collected or stored.
      </p>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Create Bot" : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(mode === "create" ? "/admin/bots" : `/admin/bots/${botId}`)}
        >
          Cancel
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}
    </form>
  );
}
