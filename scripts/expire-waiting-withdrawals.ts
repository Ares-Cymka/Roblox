import { expireWaitingWithdrawals } from "@/server/services/admin-delivery";

const EXPIRY_MINUTES = parseInt(process.env.WITHDRAWAL_EXPIRY_MINUTES ?? "30", 10);

async function main() {
  console.log(`[expire] Checking for withdrawals waiting more than ${EXPIRY_MINUTES} minutes...`);
  const { expiredCount } = await expireWaitingWithdrawals(EXPIRY_MINUTES);
  if (expiredCount > 0) {
    console.log(`[expire] Expired ${expiredCount} withdrawal(s).`);
  } else {
    console.log("[expire] No withdrawals to expire.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[expire] Error:", err);
  process.exit(1);
});
