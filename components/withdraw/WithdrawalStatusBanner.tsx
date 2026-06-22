import { Alert } from "@/components/ui/Alert";

interface WithdrawalStatusBannerProps {
  message: string | null;
  variant?: "info" | "success" | "warning";
}

export function WithdrawalStatusBanner({
  message,
  variant = "info",
}: WithdrawalStatusBannerProps) {
  if (!message) return null;

  return (
    <Alert variant={variant}>{message}</Alert>
  );
}
