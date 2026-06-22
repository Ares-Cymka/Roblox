export function botStatusToBadgeVariant(
  status: string
): "success" | "warning" | "neutral" | "info" {
  switch (status) {
    case "ONLINE":
      return "success";
    case "BUSY":
      return "info";
    case "DISABLED":
      return "warning";
    default:
      return "neutral";
  }
}

export const GAME_OPTIONS = [
  { value: "MM2", label: "Murder Mystery 2" },
  { value: "ADOPT_ME", label: "Adopt Me" },
  { value: "SAB", label: "Steal a Brainrot" },
  { value: "GAG2", label: "Grow a Garden 2" },
  { value: "OTHER", label: "Other" },
] as const;

export const BOT_STATUS_OPTIONS = [
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline" },
  { value: "BUSY", label: "Busy" },
  { value: "DISABLED", label: "Disabled" },
] as const;
