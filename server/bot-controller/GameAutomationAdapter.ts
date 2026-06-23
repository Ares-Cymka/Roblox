/**
 * GameAutomationAdapter
 *
 * Re-exports IGameAutomationAdapter for use by game-specific adapter
 * implementations, and provides a convenience abstract base class.
 *
 * Adapters that implement real in-game automation (once confirmed by the
 * client) should either implement IGameAutomationAdapter directly or
 * extend this abstract class.
 *
 * Safety rules — ALL implementations MUST follow:
 *  - Do NOT store Roblox passwords or cookies.
 *  - Do NOT call private Roblox APIs.
 *  - Do NOT bypass CAPTCHA, 2FA, rate limits, or modified clients.
 *  - Only use trade/gift/mailbox APIs the game officially exposes.
 */

export type { IGameAutomationAdapter, DeliveryJobPayload, DeliveryResult } from "./types";
