import type { IGameAutomationAdapter, DeliveryJobPayload, DeliveryResult } from "../types";

/**
 * GAG2MailboxAdapter — PLACEHOLDER for Grow a Garden 2 (GAG2) mailbox delivery.
 *
 * GAG2 uses an asynchronous mailbox/gift system — no real-time trade or
 * customer join is required.
 *
 * Real implementation requirements (to be confirmed with client):
 *  - Bot must own the GAG2 seeds/items to send.
 *  - Bot opens the GAG2 in-game mailbox/gift interface.
 *  - Bot sends items to the customer's Roblox username via mailbox.
 *  - Delivery is confirmed once the mailbox send is accepted by the game.
 *
 * Safety constraints:
 *  - MUST use only GAG2's official in-game mailbox/gift UI.
 *  - MUST NOT call any Roblox API unavailable via normal game play.
 *  - MUST NOT store Roblox passwords or session cookies.
 *
 * Implementation options:
 *  A) External bot process → calls POST /api/bot/callback after send.
 *  B) GAG2 Roblox Lua script → HttpService POST /api/bot/callback.
 */
export class GAG2MailboxAdapter implements IGameAutomationAdapter {
  readonly adapterName = "GAG2MailboxAdapter";
  readonly supportedGame = "GAG2";
  readonly supportedMethod = "MAILBOX";
  readonly isPlaceholder = true;

  async execute(payload: DeliveryJobPayload): Promise<DeliveryResult> {
    console.warn(
      `[GAG2MailboxAdapter] PLACEHOLDER — real GAG2 mailbox delivery not implemented. ` +
        `Job ${payload.jobId} requires manual delivery.`
    );

    return {
      success: false,
      message:
        "GAG2 mailbox delivery automation is not yet implemented. " +
        "Please complete the mailbox send manually using the admin dashboard and mark as delivered.",
    };
  }
}
