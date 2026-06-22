import { DeliveryMethod, GameType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listGameDeliveryConfigs() {
  return prisma.gameDeliveryConfig.findMany({
    orderBy: { game: "asc" },
  });
}

export async function getGameDeliveryConfig(game: GameType) {
  return prisma.gameDeliveryConfig.findUnique({ where: { game } });
}

export async function updateGameDeliveryConfig(
  game: GameType,
  data: {
    deliveryMethod?: DeliveryMethod;
    requiresFriend?: boolean;
    requiresPrivateServer?: boolean;
    requiresCustomerJoin?: boolean;
    requiresManualConfirmation?: boolean;
    instructions?: string | null;
    averageDeliveryMinutes?: number;
  }
) {
  return prisma.gameDeliveryConfig.update({
    where: { game },
    data,
  });
}

export function getDefaultInstructions(method: DeliveryMethod): string {
  switch (method) {
    case DeliveryMethod.TRADING:
      return "Step 1: Add the bot as a friend on Roblox.\nStep 2: Join the bot's private server.\nStep 3: Complete the in-game trade.\nStep 4: Wait for website delivery confirmation.";
    case DeliveryMethod.MAILBOX:
      return "Step 1: Confirm your Roblox username.\nStep 2: The bot sends the item through the mailbox system.\nStep 3: Wait for delivery confirmation.";
    default:
      return "Follow the on-screen delivery instructions.";
  }
}
