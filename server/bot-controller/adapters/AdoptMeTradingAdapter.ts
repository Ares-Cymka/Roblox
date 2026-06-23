import type { IGameAutomationAdapter, DeliveryJobPayload, DeliveryResult } from "../types";

/**
 * AdoptMeTradingAdapter — PLACEHOLDER for Adopt Me trading delivery.
 *
 * Real implementation requirements (to be confirmed with client):
 *  - Bot must own the Adopt Me pets/items to trade.
 *  - Bot joins the customer's server or a designated private server.
 *  - Bot uses Adopt Me's in-game trade system to send items.
 *  - Customer accepts the trade in-game.
 *
 * Safety constraints:
 *  - MUST use only Adopt Me's official in-game trade UI.
 *  - MUST NOT call any Roblox API unavailable via normal game play.
 *  - MUST NOT store Roblox passwords or session cookies.
 *
 * See MM2TradingAdapter for implementation options.
 */
export class AdoptMeTradingAdapter implements IGameAutomationAdapter {
  readonly adapterName = "AdoptMeTradingAdapter";
  readonly supportedGame = "ADOPT_ME";
  readonly supportedMethod = "TRADING";
  readonly isPlaceholder = true;

  async execute(payload: DeliveryJobPayload): Promise<DeliveryResult> {
    console.warn(
      `[AdoptMeTradingAdapter] PLACEHOLDER — real Adopt Me trading not implemented. ` +
        `Job ${payload.jobId} requires manual delivery.`
    );

    return {
      success: false,
      message:
        "Adopt Me trading automation is not yet implemented. " +
        "Please complete the trade manually using the admin dashboard and mark as delivered.",
    };
  }
}
