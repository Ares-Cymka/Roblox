import { createDeliveryWorker, registerDeliveryWorkerHandlers } from "@/server/workers/delivery";

console.log("Starting delivery worker...");

const worker = createDeliveryWorker();
registerDeliveryWorkerHandlers(worker);

worker.on("ready", () => {
  console.log("Delivery worker ready");
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
});
