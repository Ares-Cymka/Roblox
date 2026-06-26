/**
 * Sync a single bot inventory item from screen-read counts.
 *
 * Usage:
 *   npm run sync:bot-item -- --game MM2 --username radiomirrorq --name "Swirly Blade" --quantity 55
 */
import { GameType, PrismaClient } from "@prisma/client";
import { reportBotInventoryFromAgent } from "../server/services/bot-delivery";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  let game: string | undefined;
  let username: string | undefined;
  let name: string | undefined;
  let itemId: string | undefined;
  let quantity = 0;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--game") game = argv[++i];
    else if (arg === "--username") username = argv[++i];
    else if (arg === "--name") name = argv[++i];
    else if (arg === "--item-id") itemId = argv[++i];
    else if (arg === "--quantity") quantity = Number(argv[++i]);
  }

  if (!game || !username || (!name && !itemId) || Number.isNaN(quantity)) {
    throw new Error(
      'Usage: npm run sync:bot-item -- --game MM2 --username radiomirrorq --name "Swirly Blade" --quantity 55'
    );
  }

  if (!Object.values(GameType).includes(game as GameType)) {
    throw new Error(`Invalid game: ${game}`);
  }

  return {
    game: game as GameType,
    username,
    name: name ?? "",
    itemId,
    quantity,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const result = await reportBotInventoryFromAgent({
    botRobloxUsername: options.username,
    game: options.game,
    items: [
      {
        name: options.name || options.itemId || "Unknown",
        itemId: options.itemId,
        quantity: options.quantity,
      },
    ],
  });

  if ("error" in result) {
    throw new Error(result.error);
  }

  console.log(
    `Synced ${options.name || options.itemId} x${options.quantity} for ${options.username} (${options.game}).`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
