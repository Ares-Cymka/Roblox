/**
 * Bot Worker — RNGBLOX delivery automation worker process.
 *
 * This script polls the database for QUEUED delivery jobs and dispatches
 * them to the appropriate bot controller (Mock or Manual).
 *
 * Usage:
 *   npx tsx scripts/bot-worker.ts
 *
 * Environment:
 *   DELIVERY_ADAPTER=mock    → Auto-simulates deliveries (dev/testing)
 *   DELIVERY_ADAPTER=manual  → Just logs; admin confirms in dashboard (default)
 *   DELIVERY_ADAPTER=auto    → Placeholder; falls back to manual until real adapters are built
 *
 * In production this should run as a separate long-running process,
 * separate from the Next.js web server. Use a process manager (PM2,
 * systemd, Docker container, etc.) to keep it running.
 *
 * Safety: This worker never stores Roblox credentials. All actual in-game
 * delivery actions are either:
 *   - Simulated (mock mode), or
 *   - Left to admin confirmation (manual mode), or
 *   - Delegated to an external approved bot process via /api/bot/callback.
 */

import { prisma } from "../lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import { dispatchDeliveryJob } from "../server/bot-controller/BotControllerService";

const POLL_INTERVAL_MS = parseInt(process.env.BOT_WORKER_POLL_MS ?? "5000", 10);
const CONCURRENCY = parseInt(process.env.BOT_WORKER_CONCURRENCY ?? "3", 10);

let isRunning = false;
let pollCount = 0;

async function pollOnce(): Promise<void> {
  pollCount++;

  // Find QUEUED jobs that are not yet locked (lockedAt is null or expired)
  const lockExpiry = new Date(Date.now() - 5 * 60 * 1000); // 5 min lock window

  const jobs = await prisma.deliveryJob.findMany({
    where: {
      status: DeliveryStatus.QUEUED,
      OR: [
        { lockedAt: null },
        { lockedAt: { lt: lockExpiry } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: CONCURRENCY,
    select: { id: true, controllerType: true },
  });

  if (jobs.length === 0) return;

  console.log(`[BotWorker] Poll #${pollCount}: found ${jobs.length} queued job(s).`);

  await Promise.allSettled(
    jobs.map(async (job) => {
      try {
        await dispatchDeliveryJob(job.id);
        console.log(`[BotWorker] Dispatched job ${job.id} (${job.controllerType})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[BotWorker] Failed to dispatch job ${job.id}: ${msg}`);

        // Mark failed so it doesn't keep retrying on every poll
        await prisma.deliveryJob.update({
          where: { id: job.id },
          data: { status: DeliveryStatus.FAILED, lastError: msg },
        }).catch(() => {});

        await prisma.deliveryLog.create({
          data: {
            deliveryJobId: job.id,
            level: "ERROR",
            message: `[BotWorker] Dispatch error: ${msg}`,
          },
        }).catch(() => {});
      }
    })
  );
}

async function run(): Promise<void> {
  isRunning = true;

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RNGBLOX Bot Worker");
  console.log(`  DELIVERY_ADAPTER : ${process.env.DELIVERY_ADAPTER ?? "manual"}`);
  console.log(`  Poll interval    : ${POLL_INTERVAL_MS}ms`);
  console.log(`  Concurrency      : ${CONCURRENCY} jobs/poll`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Worker started. Press Ctrl+C to stop.\n");

  while (isRunning) {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[BotWorker] Poll error:", err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

process.on("SIGINT", async () => {
  console.log("\n[BotWorker] Shutting down gracefully…");
  isRunning = false;
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  isRunning = false;
  await prisma.$disconnect();
  process.exit(0);
});

run().catch((err) => {
  console.error("[BotWorker] Fatal error:", err);
  process.exit(1);
});
