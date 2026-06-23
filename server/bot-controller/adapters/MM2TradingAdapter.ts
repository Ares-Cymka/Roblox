import type { IGameAutomationAdapter, DeliveryJobPayload, DeliveryResult } from "../types";

/**
 * MM2TradingAdapter — PLACEHOLDER for Murder Mystery 2 trading delivery.
 *
 * Real implementation requirements (to be confirmed with client):
 *  - Bot must own the MM2 items to trade.
 *  - Bot joins the customer's server (or a shared private server).
 *  - Bot uses MM2's in-game trade system to send items.
 *  - Customer accepts the trade in-game.
 *  - Bot reports trade completion via POST /api/bot/callback.
 *
 * Safety constraints:
 *  - MUST use only MM2's official in-game trade UI.
 *  - MUST NOT call any Roblox API unavailable via normal game play.
 *  - MUST NOT store Roblox passwords or session cookies.
 *
 * Implementation options (client must choose):
 *  A) External bot process (separate Node/Python service with Roblox client)
 *     → calls POST /api/bot/callback when trade completes.
 *  B) Roblox Lua script inside a trusted MM2 place
 *     → uses HttpService to POST /api/bot/callback after trade confirmation.
 */
export class MM2TradingAdapter implements IGameAutomationAdapter {
  readonly adapterName = "MM2TradingAdapter";
  readonly supportedGame = "MM2";
  readonly supportedMethod = "TRADING";
  readonly isPlaceholder = true;

  async execute(payload: DeliveryJobPayload): Promise<DeliveryResult> {
    console.warn(
      `[MM2TradingAdapter] PLACEHOLDER — real MM2 trading not implemented. ` +
        `Job ${payload.jobId} requires manual delivery.`
    );

    return {
      success: false,
      message:
        "MM2 trading automation is not yet implemented. " +
        "Please complete the trade manually using the admin dashboard and mark as delivered.",
    };
  }
}
