import type { IGameAutomationAdapter, DeliveryJobPayload, DeliveryResult } from "../types";

/**
 * SABTradingAdapter — PLACEHOLDER for Steal a Brainrot (SAB) trading delivery.
 *
 * Real implementation requirements (to be confirmed with client):
 *  - Bot must own the SAB items/brainrots to trade.
 *  - Bot joins the correct game server.
 *  - Bot uses SAB's in-game trade/gifting system to transfer items.
 *  - Customer accepts the trade in-game.
 *
 * Safety constraints:
 *  - MUST use only SAB's official in-game transfer UI.
 *  - MUST NOT call any Roblox API unavailable via normal game play.
 *  - MUST NOT store Roblox passwords or session cookies.
 *
 * See MM2TradingAdapter for implementation options.
 */
export class SABTradingAdapter implements IGameAutomationAdapter {
  readonly adapterName = "SABTradingAdapter";
  readonly supportedGame = "SAB";
  readonly supportedMethod = "TRADING";
  readonly isPlaceholder = true;

  async execute(payload: DeliveryJobPayload): Promise<DeliveryResult> {
    console.warn(
      `[SABTradingAdapter] PLACEHOLDER — real SAB trading not implemented. ` +
        `Job ${payload.jobId} requires manual delivery.`
    );

    return {
      success: false,
      message:
        "Steal a Brainrot trading automation is not yet implemented. " +
        "Please complete the trade manually using the admin dashboard and mark as delivered.",
    };
  }
}
