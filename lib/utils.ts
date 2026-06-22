export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function generateClaimCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateOrderCode(): string {
  return `ORD-${generateClaimCode()}`;
}

export function generateWithdrawalCode(): string {
  return `WD-${generateClaimCode()}`;
}

export const FRAUD_REVIEW_THRESHOLD = 200;
