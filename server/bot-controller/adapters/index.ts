import type { GameType } from "@prisma/client";
import type { IGameAutomationAdapter } from "../types";
import { MM2TradingAdapter } from "./MM2TradingAdapter";
import { AdoptMeTradingAdapter } from "./AdoptMeTradingAdapter";
import { SABTradingAdapter } from "./SABTradingAdapter";
import { GAG2MailboxAdapter } from "./GAG2MailboxAdapter";

const adapterMap = new Map<GameType, IGameAutomationAdapter>([
  ["MM2", new MM2TradingAdapter()],
  ["ADOPT_ME", new AdoptMeTradingAdapter()],
  ["SAB", new SABTradingAdapter()],
  ["GAG2", new GAG2MailboxAdapter()],
]);

export function getGameAdapter(game: GameType): IGameAutomationAdapter | null {
  return adapterMap.get(game) ?? null;
}

export {
  MM2TradingAdapter,
  AdoptMeTradingAdapter,
  SABTradingAdapter,
  GAG2MailboxAdapter,
};
