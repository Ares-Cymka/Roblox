/**
 * Shared types for the bot controller layer.
 *
 * Architecture overview:
 *
 *   Website/Backend
 *        │
 *        ▼
 *   BotControllerService        ← orchestrates jobs
 *        │
 *   IBotController              ← high-level controller (Manual / Mock)
 *        │
 *   IGameAutomationAdapter      ← game-specific in-game action
 *   (MM2 / AdoptMe / SAB / GAG2)
 *
 * The two layers exist because:
 *  - IBotController handles job lifecycle (QUEUED → PROCESSING → DELIVERED/FAILED)
 *  - IGameAutomationAdapter handles the actual in-game action for each game
 */

import type { GameType } from "@prisma/client";

export type DeliveryItem = {
  productId: string;
  name: string;
  quantity: number;
  unitValue: number;
};

/**
 * All the information a game adapter needs to execute a delivery.
 */
export type DeliveryContext = {
  jobId: string;
  withdrawalId?: string;
  claimId?: string;

  // Bot that will perform the delivery
  botAccountId: string;
  botUsername: string;
  botProfileUrl?: string;
  botPrivateServerUrl?: string;

  // Customer receiving the delivery
  customerRobloxUsername: string;

  // Game/method
  game: string;
  deliveryMethod: string;

  // What to deliver
  items: DeliveryItem[];
};

/**
 * Result returned by a GameAutomationAdapter after attempting delivery.
 */
export type DeliveryResult = {
  success: boolean;
  message: string;
  /** Optional proof to attach to DeliveryLog */
  proof?: {
    text?: string;
    imageUrl?: string;
  };
};

/**
 * Summary of a pending job returned by GET /api/bot/jobs/pending.
 * An external bot agent polls this endpoint to discover jobs it should process.
 */
export type PendingJobSummary = {
  jobId: string;
  withdrawalId: string | null;
  claimId: string | null;
  withdrawalCode: string | null;
  mm2SessionId: string | null;
  game: GameType;
  deliveryMethod: string;
  customerRobloxUsername: string;
  botRobloxUsername: string;
  privateServerUrl: string | null;
  items: Array<
    DeliveryItem & {
      itemId: string;
    }
  >;
  queuedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// IBotController — high-level controller interface
// Used by ManualBotController and MockBotController
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full payload sent to a bot controller when a delivery job is dispatched.
 * Contains everything the controller and adapter need to perform the delivery.
 */
export type DeliveryJobPayload = {
  jobId: string;
  withdrawalId?: string | null;
  claimId?: string | null;

  game: string;
  deliveryMethod: string;

  customerRobloxUsername: string;
  botRobloxUsername: string;
  botProfileUrl: string;
  botPrivateServerUrl?: string | null;

  items: DeliveryItem[];

  requiresFriend: boolean;
  requiresCustomerJoin: boolean;

  controllerType: "MANUAL" | "MOCK" | "AUTO";
  attemptNumber: number;
};

/**
 * High-level bot controller.
 * Responsible for job lifecycle management (status transitions, logs).
 * ManualBotController and MockBotController implement this.
 */
export interface IBotController {
  readonly name: string;
  dispatch(payload: DeliveryJobPayload): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// IGameAutomationAdapter — game-specific in-game action interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Low-level game automation adapter.
 * Each game (MM2, Adopt Me, SAB, GAG2) provides its own implementation.
 * The adapter performs (or simulates) the actual in-game transfer.
 *
 * Safety constraints — ALL implementations MUST follow:
 *  - Do NOT store Roblox passwords or cookies.
 *  - Do NOT call private Roblox APIs.
 *  - Do NOT bypass CAPTCHA, 2FA, rate limits, or modified clients.
 *  - Only use trade/gift/mailbox APIs the game officially exposes.
 */
export interface IGameAutomationAdapter {
  readonly adapterName: string;
  readonly supportedGame: string;
  readonly supportedMethod: string;
  readonly isPlaceholder: boolean;

  /** Execute the in-game delivery. Returns a result with success/failure. */
  execute(payload: DeliveryJobPayload): Promise<DeliveryResult>;

  /** Optional: cancel an in-progress delivery. Default: no-op. */
  cancel?(jobId: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AdapterCapabilities — metadata about what an adapter supports
// (used by GameAutomationAdapter abstract class)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes what a given adapter can do.
 */
export type AdapterCapabilities = {
  /** Human-readable adapter name, e.g. "MockBotAdapter" */
  name: string;
  /** BotControllerType value this adapter registers as */
  controllerType: "MANUAL" | "MOCK" | "AUTO";
  /** Games this adapter handles (GameType enum values as strings) */
  supportedGames: string[];
  /** Delivery methods this adapter handles */
  supportedMethods: string[];
  /**
   * true  = adapter only simulates/schedules delivery; a human must
   *         confirm in the admin dashboard.
   * false = adapter performs delivery autonomously.
   */
  requiresManualConfirmation: boolean;
  /**
   * true  = placeholder only; real implementation not yet provided.
   */
  isPlaceholder: boolean;
};
